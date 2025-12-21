// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PatientRegistry {
    struct Patient {
        string name;
        uint256 birthDate;
        string medicalRecord;
        bool exists;
    }

    mapping(string => Patient) private patients; // ID pasien => data pasien

    // Fungsi search pasien berdasarkan ID
    function searchPatient(string memory _id) public view returns (string memory name, uint256 birthDate, string memory medicalRecord) {
        require(patients[_id].exists, "Patient not found");
        Patient memory p = patients[_id];
        return (p.name, p.birthDate, p.medicalRecord);
    }
}