// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AurumPayroll
 * @notice Privacy-grade payroll contract using ZK identity verification
 * @dev HSP (HashKey Settlement Protocol) compatible payroll system
 *      Chain ID: 133 (HashKey Chain Testnet)
 */
contract AurumPayroll is Ownable, ReentrancyGuard {

    // ─── Types ───
    struct Employee {
        address wallet;
        bytes32 identityHash;      // Poseidon hash of identityCommitment
        uint256 salary;
        uint256 lastPayroll;
        bool isActive;
    }

    struct PayrollBatch {
        uint256 period;
        uint256 totalAmount;
        uint256 employeeCount;
        bool processed;
    }

    // ─── State ───
    IERC20 public usdc;
    
    mapping(bytes32 => Employee) public employees;        // identityHash → Employee
    mapping(address => bytes32) public addressToIdentity; // wallet → identityHash
    
    PayrollBatch[] public payrollHistory;
    bytes32[] public employeeIds;
    
    uint256 public minimumSalary = 100e6;  // 100 USDC minimum
    uint256 public payrollInterval = 30 days;
    
    // Events
    event EmployeeRegistered(bytes32 indexed identityHash, address indexed wallet, uint256 salary);
    event EmployeeRemoved(bytes32 indexed identityHash);
    event PayrollDeposited(uint256 indexed period, uint256 amount, uint256 employeeCount);
    event PayrollClaimed(bytes32 indexed identityHash, uint256 amount);
    event ZKProofVerified(bytes32 indexed identityHash, bool success);

    // ─── Constructor ───
    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");
        usdc = IERC20(_usdc);
    }

    // ─── Owner Functions ───

    /**
     * @notice Register employee with ZK identity commitment
     * @param identityHash Poseidon hash of identity commitment (public input)
     * @param wallet Employee withdrawal wallet
     * @param salary Monthly salary in USDC (6 decimals)
     */
    function registerEmployee(
        bytes32 identityHash,
        address wallet,
        uint256 salary
    ) external onlyOwner {
        require(wallet != address(0), "Invalid wallet");
        require(salary >= minimumSalary, "Salary below minimum");
        require(employees[identityHash].wallet == address(0), "Already registered");
        require(addressToIdentity[wallet] == bytes32(0), "Wallet already registered");

        employeeIds.push(identityHash);
        employees[identityHash] = Employee({
            wallet: wallet,
            identityHash: identityHash,
            salary: salary,
            lastPayroll: 0,
            isActive: true
        });
        
        addressToIdentity[wallet] = identityHash;

        emit EmployeeRegistered(identityHash, wallet, salary);
    }

    /**
     * @notice Remove employee from payroll
     */
    function removeEmployee(bytes32 identityHash) external onlyOwner {
        require(employees[identityHash].isActive, "Not active");
        employees[identityHash].isActive = false;
        require(employees[identityHash].isActive, "Not active");
        
        address wallet = employees[identityHash].wallet;
        delete addressToIdentity[wallet];
        delete employees[identityHash];
        
        emit EmployeeRemoved(identityHash);
    }

    /**
     * @notice Deposit payroll for active employees
     * @param period Period identifier (e.g., block timestamp)
     */
    function depositPayroll(uint256 period) external onlyOwner nonReentrant {
        
        uint256 totalSalary = 0;
        
        // Calculate totals
        for (uint i = 0; i < payrollHistory.length; i++) {
            if (!payrollHistory[i].processed) {
                // Count pending
            }
        }
        
        // Get all active employees and calculate total
        
        uint256 count = 0;
        
        // Iterate through employeeIds array
        for (uint i = 0; i < employeeIds.length; i++) {
            bytes32 empId = employeeIds[i];
            if (employees[empId].isActive) {
                totalSalary += employees[empId].salary;
                count++;
            }
        }

        require(totalSalary > 0, "No active employees");
        require(usdc.transferFrom(msg.sender, address(this), totalSalary), "Transfer failed");

        payrollHistory.push(PayrollBatch({
            period: period,
            totalAmount: totalSalary,
            employeeCount: count,
            processed: false
        }));

        emit PayrollDeposited(period, totalSalary, count);
    }

    /**
     * @notice Claim payroll with ZK proof verification
     * @param identityHash Public input: Poseidon hash of identity commitment
     * @param proofbytes Circuit proof (Groth16)
     * @param pubSignals Public signals from ZK circuit
     */
    function claimPayroll(
        bytes32 identityHash,
        bytes calldata proofbytes,
        uint256[2] calldata pubSignals
    ) external nonReentrant {
        require(employees[identityHash].isActive, "Not registered");
        require(employees[identityHash].wallet == msg.sender, "Not your wallet");
        
        // Verify ZK proof
        bool valid = verifyProof(identityHash, proofbytes, pubSignals);
        require(valid, "ZK proof invalid");
        
        emit ZKProofVerified(identityHash, true);

        // Transfer salary
        uint256 salary = employees[identityHash].salary;
        employees[identityHash].lastPayroll = block.timestamp;
        
        require(usdc.transfer(msg.sender, salary), "Transfer failed");
        
        emit PayrollClaimed(identityHash, salary);
    }

    /**
     * @notice Emergency withdrawal by owner
     */
    function emergencyWithdraw(address to) external onlyOwner {
        require(to != address(0), "Invalid address");
        uint256 balance = usdc.balanceOf(address(this));
        require(usdc.transfer(to, balance), "Transfer failed");
    }

    /**
     * @notice Update minimum salary
     */
    function updateMinimumSalary(uint256 newMin) external onlyOwner {
        minimumSalary = newMin;
    }

    // ─── View Functions ───

    /**
     * @notice Verify ZK proof (mock - replace with real Groth16 verifier)
     * @dev In production, integrate with real Groth16 verifier (gnark)
     */
    function verifyProof(
        bytes32 identityHash,
        bytes calldata,
        uint256[2] calldata
    ) public view returns (bool) {
        // Mock verification - always returns true for testnet demo
        // In production: integrate with gnark BN254 precompile
        require(employees[identityHash].isActive, "Not registered");
        return true;
    }

    function getActiveEmployeeCount() public view returns (uint256) {
        uint256 count = 0;
        // Simplified - in production use efficient iteration
        for (uint i = 0; i < 100; i++) {
            if (employees[bytes32(i)].isActive) count++;
        }
        return count;
    }

    function getEmployee(bytes32 identityHash) external view returns (Employee memory) {
        return employees[identityHash];
    }

    function getPayrollHistoryLength() external view returns (uint256) {
        return payrollHistory.length;
    }
}