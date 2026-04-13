// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title MockVerifier - Mock ZK Proof Verifier
/// @notice Mock implementation for testing. Replace with real Groth16 verifier in production.
contract MockVerifier {
    event ProofVerified(address indexed prover, bytes32 input);
    event MockVerification(string message);

    bool public isVerificationEnabled = true;

    // Mock verification - accepts all proofs in test mode
    function verifyProof(
        bytes32,
        bytes32,
        bytes32[2] memory,
        bytes32[2][2] memory,
        bytes32[2] memory,
        bytes32[3] memory
    ) external view returns (bool) {
        require(isVerificationEnabled, "MockVerifier: verification disabled");
        return true;
    }

    // Alternative mock that can be called without proof data
    function verifyProofSimple(bytes32 identityHash) external view returns (bool) {
        require(isVerificationEnabled, "MockVerifier: verification disabled");
        return identityHash != bytes32(0);
    }

    function setVerificationEnabled(bool enabled) external {
        isVerificationEnabled = enabled;
    }
}
