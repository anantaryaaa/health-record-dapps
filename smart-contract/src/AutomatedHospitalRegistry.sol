// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @title AutomatedHospitalRegistry
 * @dev Kontrak untuk pendaftaran Rumah Sakit dengan verifikasi otomatis berbasis Signature.
 *      Mendukung ERC-2771 Meta-Transactions untuk gasless registration.
 */
contract AutomatedHospitalRegistry is ERC2771Context {
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

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when a hospital is registered
    event HospitalRegistered(
        address indexed hospitalWallet,
        string name,
        string licenseNumber,
        uint256 timestamp
    );

    /**
     * @dev Constructor: Menetapkan alamat verifikator sistem dan trusted forwarder.
     * @param _systemVerifier Alamat backend yang memberikan signature validasi
     * @param _trustedForwarder Alamat ERC-2771 trusted forwarder untuk gasless transactions
     */
    constructor(
        address _systemVerifier, 
        address _trustedForwarder
    ) ERC2771Context(_trustedForwarder) {
        systemVerifier = _systemVerifier;
    }

    /**
     * @dev Fungsi Registrasi Seamless dengan dukungan gasless.
     * @param _name Nama Rumah Sakit.
     * @param _licenseNumber Kode RS/NIB dari pemerintah.
     * @param _signature Stempel digital dari backend sebagai bukti validasi API pemerintah.
     */
    function registerHospital(
        string memory _name, 
        string memory _licenseNumber, 
        bytes memory _signature
    ) external {
        address sender = _msgSender();
        
        require(hospitals[sender].wallet == address(0), "Akun ini sudah terdaftar");

        // 1. Rekonstruksi hash pesan (Wallet RS + Kode RS)
        bytes32 messageHash = keccak256(abi.encodePacked(sender, _licenseNumber));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        // 2. Verifikasi Kriptografi: Apakah benar backend kita yang menandatangani?
        require(
            ethSignedMessageHash.recover(_signature) == systemVerifier, 
            "Data tidak valid menurut database pemerintah!"
        );

        // 3. Jika valid, simpan data dengan status terverifikasi otomatis
        hospitals[sender] = Hospital({
            name: _name,
            licenseNumber: _licenseNumber,
            wallet: sender,
            isVerified: true
        });

        emit HospitalRegistered(sender, _name, _licenseNumber, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Check if a hospital is verified
     * @param _hospital The hospital address to check
     * @return True if hospital is verified
     */
    function isHospitalVerified(address _hospital) external view returns (bool) {
        return hospitals[_hospital].isVerified;
    }

    /**
     * @notice Get hospital details
     * @param _hospital The hospital address
     * @return name Hospital name
     * @return licenseNumber Government license number
     * @return wallet Hospital wallet address
     * @return isVerified Verification status
     */
    function getHospitalDetails(address _hospital) external view returns (
        string memory name,
        string memory licenseNumber,
        address wallet,
        bool isVerified
    ) {
        Hospital memory h = hospitals[_hospital];
        return (h.name, h.licenseNumber, h.wallet, h.isVerified);
    }
}