const { ethers } = require('ethers');

const RPC = "https://133.rpc.thirdweb.com";
const USDC = "0xEd00a5915fD351d504bcF79F1f14DB1a6513Ba71";
const CONTRACT = "0x7cEB857fcBE1C3Ff14356d5aB6F4f593D657B29f";
const PRIVATE_KEY = "0x97a14df4110049a4f3a49f4b562c041954cb57ed4aacc069dcb7e2285860953b";

const ABI = [
  "function owner() view returns (address)",
  "function getActiveEmployeeCount() view returns (uint256)",
  "function minimumSalary() view returns (uint256)",
  "function employees(bytes32) view returns (address, bytes32, uint256, uint256, bool)",
  "function registerEmployee(bytes32, address, uint256)",
  "function depositPayroll(uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  const readOnly = new ethers.Contract(CONTRACT, ABI, provider);
  const contract = new ethers.Contract(CONTRACT, ABI, wallet);
  const usdc = new ethers.Contract(USDC, ["function mint(address,uint256)","function balanceOf(address) view returns (uint256)","function approve(address,uint256)"], wallet);

  const cmd = process.argv[2] || "help";
  console.log("\n=== AURUM Payroll ===");

  try {
    switch(cmd) {
      case "info": {
        const [owner, active, min] = await Promise.all([readOnly.owner(), readOnly.getActiveEmployeeCount(), readOnly.minimumSalary()]);
        console.log("Owner:", owner);
        console.log("Active Employees:", active.toString());
        console.log("Min Salary:", ethers.formatUnits(min, 6), "USDC");
        break;
      }
      case "mint": {
        const [amt] = process.argv.slice(3,4);
        await (await usdc.mint(wallet.address, ethers.parseUnits(amt || "1000", 6))).wait();
        const bal = await usdc.balanceOf(wallet.address);
        console.log("✓ Minted", amt || "1000", "USDC! Balance:", ethers.formatUnits(bal, 6));
        break;
      }
      case "register": {
        const [id, w, sal] = process.argv.slice(3,6);
        const tx = await contract.registerEmployee(id, w, ethers.parseUnits(sal, 6));
        await tx.wait();
        console.log("✓ Registered! ID:", id);
        break;
      }
      case "deposit": {
        const bal = await usdc.balanceOf(wallet.address);
        console.log("Wallet USDC:", ethers.formatUnits(bal, 6));
        await (await usdc.approve(CONTRACT, bal)).wait();
        const tx = await contract.depositPayroll(30);
        await tx.wait();
        console.log("✓ Deposited payroll for 30 days!");
        break;
      }
      case "status": {
        const [id] = process.argv.slice(3,4);
        const emp = await readOnly.employees(id);
        console.log("Wallet:", emp[0]);
        console.log("Salary:", ethers.formatUnits(emp[2], 6), "USDC");
        console.log("Active:", emp[4]);
        break;
      }
      default:
        console.log("Commands: info | mint [amt] | register <id> <wallet> <sal> | deposit | status <id>");
    }
  } catch(e) {
    console.log("Error:", e.reason || e.message.substring(0,200));
  }
}
main().catch(console.error);
