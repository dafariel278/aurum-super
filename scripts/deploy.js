const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AURUM Payroll to HashKey Chain Testnet...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy MockVerifier first (replace with real Groth16 verifier in production)
  console.log("\n📝 Deploying MockVerifier...");
  const Verifier = await hre.ethers.getContractFactory("MockVerifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("✅ MockVerifier deployed:", verifierAddress);

  // Deploy AurumPayroll with verifier address
  console.log("\n📝 Deploying AurumPayroll...");
  const Payroll = await hre.ethers.getContractFactory("AurumPayroll");
  const payroll = await Payroll.deploy(verifierAddress);
  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("✅ AurumPayroll deployed:", payrollAddress);

  // Save addresses
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network: HashKey Chain Testnet (Chain ID: 133)");
  console.log("Explorer: https://hashkeychain-testnet-explorer.alt.technology");
  console.log("");
  console.log("CONTRACT ADDRESSES:");
  console.log("  MockVerifier:", verifierAddress);
  console.log("  AurumPayroll:", payrollAddress);
  console.log("=".repeat(60));

  // Verify on explorer (if API key configured)
  if (process.env.ETHERSCAN_API_KEY) {
    try {
      await hre.run("verify:verify", {
        address: payrollAddress,
        constructorArguments: [verifierAddress],
      });
      console.log("✅ Verified on HashKey Explorer");
    } catch (e) {
      console.log("⚠️  Verification skipped (API key may not be configured)");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
