// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title AutomatedHospitalRegistry
 * @dev Kontrak untuk pendaftaran Rumah Sakit dengan verifikasi otomatis berbasis Signature.
 */
contract AutomatedHospitalRegistry {
    using ECDSA for bytes32;

    // Alamat Backend/Robot yang berhak memberikan tanda tangan validasi
    address public systemVerifier;

    struct Hospital {
        string name;
        string licenseNumber;
        address wallet;
        bool isVerified;
    }

    // Penyimpanan data rumah sakit berdasarkan alamat wallet
    mapping(address => Hospital) public hospitals;

    /**
     * @dev Constructor: Menetapkan alamat verifikator sistem.
     */
    constructor(address _systemVerifier) {
        systemVerifier = _systemVerifier;
    }

    /**
     * @dev Fungsi Registrasi Seamless.
     * @param _name Nama Rumah Sakit.
     * @param _licenseNumber Kode RS/NIB dari pemerintah.
     * @param _signature Stempel digital dari backend sebagai bukti validasi API pemerintah.
     */
    function registerHospital(
        string memory _name, 
        string memory _licenseNumber, 
        bytes memory _signature
    ) external {
        require(hospitals[msg.sender].wallet == address(0), "Akun ini sudah terdaftar");

        // 1. Rekonstruksi hash pesan (Wallet RS + Kode RS)
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, _licenseNumber));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // 2. Verifikasi Kriptografi: Apakah benar backend kita yang menandatangani?
        require(
            ethSignedMessageHash.recover(_signature) == systemVerifier, 
            "Data tidak valid menurut database pemerintah!"
        );

        // 3. Jika valid, simpan data dengan status terverifikasi otomatis
        hospitals[msg.sender] = Hospital({
            name: _name,
            licenseNumber: _licenseNumber,
            wallet: msg.sender,
            isVerified: true
        });
    }
}