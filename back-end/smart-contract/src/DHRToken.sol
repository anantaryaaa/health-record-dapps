// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DHRToken
 * @dev Simple ERC20 token for reward/insentif validator & kontributor data.
 */
contract DHRToken {
    string public name = "Decentralized Health Record Token";
    string public symbol = "DHR";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    constructor(uint256 _initialSupply) {
        owner = msg.sender;
        _mint(owner, _initialSupply);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "Mint to zero address");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "Transfer to zero address");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
