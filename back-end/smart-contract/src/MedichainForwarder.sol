// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/metatx/ERC2771Forwarder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MedichainForwarder
 * @author Medichain Development Team
 * @notice A trusted forwarder for gasless meta-transactions in the Medichain ecosystem
 * @dev Extends OpenZeppelin's ERC2771Forwarder with additional management features
 * 
 * This contract enables gasless transactions for:
 * - Patients (registering, granting/revoking access)
 * - Hospitals (adding medical records)
 * 
 * The admin (deployer) funds this contract's relayer wallet to pay for all gas fees,
 * allowing users to interact with Medichain without holding ETH.
 * 
 * Flow:
 * 1. User signs a meta-transaction off-chain (free, no gas)
 * 2. Relayer backend receives the signed request
 * 3. Relayer calls execute() on this contract, paying gas
 * 4. This contract forwards the call to target contract with original sender info
 */
contract MedichainForwarder is ERC2771Forwarder, Ownable {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when a meta-transaction is successfully relayed
    event MetaTransactionRelayed(
        address indexed from,
        address indexed to,
        uint256 gasUsed,
        bool success
    );

    /// @notice Emitted when the relayer balance is topped up
    event RelayerFunded(address indexed funder, uint256 amount);

    /// @notice Emitted when funds are withdrawn by owner
    event FundsWithdrawn(address indexed to, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES  
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Total number of meta-transactions relayed
    uint256 public totalRelayedTransactions;

    /// @notice Mapping to track gas used per user (for analytics)
    mapping(address => uint256) public gasUsedByUser;

    /// @notice Maximum gas limit per meta-transaction (prevents abuse)
    uint256 public maxGasLimit;

    /// @notice Whether the forwarder is paused
    bool public paused;

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════

    error ForwarderPaused();
    error GasLimitExceeded();
    error WithdrawalFailed();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════

    modifier whenNotPaused() {
        if (paused) revert ForwarderPaused();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes the MedichainForwarder
     * @param _owner The owner/admin of the forwarder (can withdraw funds, pause)
     */
    constructor(address _owner) 
        ERC2771Forwarder("MedichainForwarder") 
        Ownable(_owner) 
    {
        maxGasLimit = 1_000_000; // 1M gas max per transaction
        paused = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Pauses the forwarder (emergency stop)
     * @dev Only owner can pause
     */
    function pause() external onlyOwner {
        paused = true;
    }

    /**
     * @notice Unpauses the forwarder
     * @dev Only owner can unpause
     */
    function unpause() external onlyOwner {
        paused = false;
    }

    /**
     * @notice Sets the maximum gas limit per transaction
     * @param _maxGasLimit The new maximum gas limit
     */
    function setMaxGasLimit(uint256 _maxGasLimit) external onlyOwner {
        maxGasLimit = _maxGasLimit;
    }

    /**
     * @notice Allows owner to withdraw ETH from the contract
     * @param _to The address to send ETH to
     * @param _amount The amount of ETH to withdraw
     */
    function withdraw(address payable _to, uint256 _amount) external onlyOwner {
        (bool success, ) = _to.call{value: _amount}("");
        if (!success) revert WithdrawalFailed();
        emit FundsWithdrawn(_to, _amount);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FUNDING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Allows anyone to fund the forwarder for gas payments
     * @dev The owner typically funds this to sponsor all transactions
     */
    receive() external payable {
        emit RelayerFunded(msg.sender, msg.value);
    }

    /**
     * @notice Explicit function to fund the forwarder
     */
    function fund() external payable {
        emit RelayerFunded(msg.sender, msg.value);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * @notice Returns the current balance of the forwarder
     * @return The ETH balance available for gas payments
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Returns statistics about the forwarder usage
     * @return _totalRelayed Total transactions relayed
     * @return _balance Current ETH balance
     * @return _maxGas Maximum gas limit per tx
     * @return _isPaused Whether forwarder is paused
     */
    function getStats() external view returns (
        uint256 _totalRelayed,
        uint256 _balance,
        uint256 _maxGas,
        bool _isPaused
    ) {
        return (totalRelayedTransactions, address(this).balance, maxGasLimit, paused);
    }
}
