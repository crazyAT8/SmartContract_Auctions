// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OrderBookAuction {
    enum OrderType { Buy, Sell }

    struct Order {
        address user;
        uint256 price;
        uint256 amount;
        OrderType orderType;
    }

    address public admin;
    uint256 public auctionEndTime;
    bool public auctionEnded;
    
    Order[] public buyOrders;
    Order[] public sellOrders;

    mapping(address => uint256) public balances; // User balances in the contract
    uint256 public clearingPrice; // Final execution price after auction

    event OrderPlaced(address indexed user, uint256 price, uint256 amount, OrderType orderType);
    event AuctionEnded(uint256 clearingPrice);
    event TradeExecuted(address indexed buyer, address indexed seller, uint256 price, uint256 amount);

    modifier onlyBeforeEnd() {
        require(block.timestamp < auctionEndTime, "Auction has ended");
        _;
    }

    modifier onlyAfterEnd() {
        require(block.timestamp >= auctionEndTime, "Auction is still ongoing");
        _;
    }

    constructor(uint256 _auctionDuration) {
        admin = msg.sender;
        auctionEndTime = block.timestamp + _auctionDuration;
    }

    function placeBuyOrder(uint256 price, uint256 amount) external payable onlyBeforeEnd {
        require(msg.value == price * amount, "Incorrect ETH sent");
        buyOrders.push(Order(msg.sender, price, amount, OrderType.Buy));
        emit OrderPlaced(msg.sender, price, amount, OrderType.Buy);
    }

    function placeSellOrder(uint256 price, uint256 amount) external onlyBeforeEnd {
        require(balances[msg.sender] >= amount, "Insufficient tokens to sell");
        sellOrders.push(Order(msg.sender, price, amount, OrderType.Sell));
        emit OrderPlaced(msg.sender, price, amount, OrderType.Sell);
    }

    function determineClearingPrice() internal onlyAfterEnd {
        // Sort buy orders in descending price order
        _sortOrders(buyOrders, true);
        // Sort sell orders in ascending price order
        _sortOrders(sellOrders, false);

        uint256 totalBuyAmount = 0;
        uint256 totalSellAmount = 0;
        uint256 matchingPrice = 0;

        for (uint256 i = 0; i < buyOrders.length && i < sellOrders.length; i++) {
            if (buyOrders[i].price >= sellOrders[i].price) {
                totalBuyAmount += buyOrders[i].amount;
                totalSellAmount += sellOrders[i].amount;
                matchingPrice = sellOrders[i].price;
            } else {
                break;
            }
        }

        clearingPrice = matchingPrice;
        auctionEnded = true;
        emit AuctionEnded(clearingPrice);
    }

    function settleTrades() external onlyAfterEnd {
        require(auctionEnded, "Auction has not been processed yet");

        for (uint256 i = 0; i < buyOrders.length; i++) {
            if (buyOrders[i].price >= clearingPrice) {
                // Execute trade with matching sell orders
                for (uint256 j = 0; j < sellOrders.length; j++) {
                    if (sellOrders[j].price <= clearingPrice) {
                        uint256 tradeAmount = (buyOrders[i].amount > sellOrders[j].amount)
                            ? sellOrders[j].amount
                            : buyOrders[i].amount;

                        balances[sellOrders[j].user] -= tradeAmount;
                        payable(sellOrders[j].user).transfer(tradeAmount * clearingPrice);
                        balances[buyOrders[i].user] += tradeAmount;

                        emit TradeExecuted(buyOrders[i].user, sellOrders[j].user, clearingPrice, tradeAmount);
                    }
                }
            }
        }
    }

    function depositTokens(uint256 amount) external {
        balances[msg.sender] += amount;
    }

    function _sortOrders(Order[] storage orders, bool descending) internal {
        for (uint256 i = 0; i < orders.length; i++) {
            for (uint256 j = i + 1; j < orders.length; j++) {
                if ((descending && orders[i].price < orders[j].price) || 
                    (!descending && orders[i].price > orders[j].price)) {
                    (orders[i], orders[j]) = (orders[j], orders[i]);
                }
            }
        }
    }
}
