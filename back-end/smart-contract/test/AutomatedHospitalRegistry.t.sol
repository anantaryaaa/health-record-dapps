// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AutomatedHospitalRegistry.sol";

contract AutomatedHospitalRegistryTest is Test {
    AutomatedHospitalRegistry public registry;

    // Simulasi Kunci Rahasia Backend
    uint256 internal verifierPrivateKey = 0xA1B2C3D4; 
    address internal systemVerifier;
    
    // Data Rumah Sakit untuk Testing
    address internal hospitalWallet = address(0x123);
    string internal hospitalName = "RS Harapan Bunda";
    string internal licenseNo = "RS-999-XYZ";

    function setUp() public {
        // Mendapatkan address publik dari private key simulasi
        systemVerifier = vm.addr(verifierPrivateKey);
        
        // Deploy kontrak ke network testing Foundry
        registry = new AutomatedHospitalRegistry(systemVerifier);
    }

    /**
     * @dev Test Kasus Sukses: Pendaftaran dengan Signature yang Benar.
     */
    function test_SuccessfulRegistration() public {
        // 1. Siapkan hash data yang akan di-sign (mengikuti logika kontrak)
        bytes32 messageHash = keccak256(abi.encodePacked(hospitalWallet, licenseNo));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // 2. Simulasi Backend menandatangani data secara off-chain
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(verifierPrivateKey, ethSignedMessageHash);
        bytes memory validSignature = abi.encodePacked(r, s, v);

        // 3. Rumah Sakit memanggil kontrak menggunakan walletnya
        vm.prank(hospitalWallet); 
        registry.registerHospital(hospitalName, licenseNo, validSignature);

        // 4. Verifikasi status di blockchain
        (,, address wallet, bool isVerified) = registry.hospitals(hospitalWallet);
        assertTrue(isVerified, "RS seharusnya sudah terverifikasi");
        assertEq(wallet, hospitalWallet, "Alamat wallet tidak sesuai");
    }

    /**
     * @dev Test Kasus Gagal: Mencoba mendaftar dengan Signature palsu (Scam).
     */
    function test_FailInvalidSignature() public {
        uint256 hackerPrivateKey = 0xDEADBEEF; // Private key milik penipu
        
        bytes32 messageHash = keccak256(abi.encodePacked(hospitalWallet, licenseNo));
        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // Penipu mencoba menandatangani sendiri datanya
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(hackerPrivateKey, ethSignedMessageHash);
        bytes memory fakeSignature = abi.encodePacked(r, s, v);

        // Transaksi harus ditolak oleh Smart Contract
        vm.prank(hospitalWallet);
        vm.expectRevert("Data tidak valid menurut database pemerintah!");
        registry.registerHospital(hospitalName, licenseNo, fakeSignature);
    }
}