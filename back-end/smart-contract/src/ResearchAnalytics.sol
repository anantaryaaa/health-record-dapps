// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ResearchAnalytics
 * @dev Contract for managing anonymized data requests and research access in a decentralized health record system.
 */
contract ResearchAnalytics {
    address public owner;
    uint256 public requestCounter;

    struct DataRequest {
        uint256 id;
        address requester;
        string purpose; // e.g., research topic or description
        uint256 reward; // token reward offered for data contributors
        bool approved;
        bool fulfilled;
        string resultSummary; // e.g., statistical result (not raw data)
    }

    mapping(uint256 => DataRequest) public dataRequests;
    mapping(address => bool) public approvedResearchers;

    event ResearcherApproved(address indexed researcher);
    event ResearcherRevoked(address indexed researcher);
    event DataRequestCreated(uint256 indexed id, address indexed requester, string purpose, uint256 reward);
    event DataRequestApproved(uint256 indexed id);
    event DataRequestFulfilled(uint256 indexed id, string resultSummary);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    modifier onlyApprovedResearcher() {
        require(approvedResearchers[msg.sender], "Not approved researcher");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Approve a researcher (only owner)
    function approveResearcher(address researcher) external onlyOwner {
        approvedResearchers[researcher] = true;
        emit ResearcherApproved(researcher);
    }

    // Revoke researcher approval (only owner)
    function revokeResearcher(address researcher) external onlyOwner {
        approvedResearchers[researcher] = false;
        emit ResearcherRevoked(researcher);
    }

    // Create a new data request (only approved researcher)
    function createDataRequest(string calldata purpose, uint256 reward) external onlyApprovedResearcher returns (uint256) {
        requestCounter++;
        dataRequests[requestCounter] = DataRequest({
            id: requestCounter,
            requester: msg.sender,
            purpose: purpose,
            reward: reward,
            approved: false,
            fulfilled: false,
            resultSummary: ""
        });
        emit DataRequestCreated(requestCounter, msg.sender, purpose, reward);
        return requestCounter;
    }

    // Approve a data request (only owner)
    function approveDataRequest(uint256 requestId) external onlyOwner {
        require(dataRequests[requestId].id != 0, "Request not found");
        dataRequests[requestId].approved = true;
        emit DataRequestApproved(requestId);
    }

    // Fulfill a data request with result summary (only owner, e.g., after off-chain aggregation)
    function fulfillDataRequest(uint256 requestId, string calldata resultSummary) external onlyOwner {
        require(dataRequests[requestId].approved, "Request not approved");
        require(!dataRequests[requestId].fulfilled, "Already fulfilled");
        dataRequests[requestId].fulfilled = true;
        dataRequests[requestId].resultSummary = resultSummary;
        emit DataRequestFulfilled(requestId, resultSummary);
    }

    // Get data request details
    function getDataRequest(uint256 requestId) external view returns (DataRequest memory) {
        return dataRequests[requestId];
    }

    // Check if an address is an approved researcher
    function isApprovedResearcher(address researcher) external view returns (bool) {
        return approvedResearchers[researcher];
    }
}
