// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/PatientRegistry.sol";

contract PatientRegistryTest is Test {
    PatientRegistry registry;

    function setUp() public {
        registry = new PatientRegistry();
        // Setup data pasien untuk test
        // Karena tidak ada fungsi add, bisa langsung set mapping jika public, atau tambahkan fungsi khusus untuk test
        // Untuk contoh, asumsikan mapping public atau tambahkan fungsi khusus test
    }

    function testSearchPatientNotFound() public {
        vm.expectRevert(bytes("Patient not found"));
        registry.searchPatient("not_exist");
    }

    // Jika ingin test data ditemukan, mapping harus diisi dulu
    // Bisa tambahkan fungsi khusus untuk test, atau ubah mapping jadi public untuk test
}