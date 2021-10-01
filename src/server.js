require('dotenv').config()

const express = require('express')
const Web3 = require("web3")
const web3 = new Web3("https://bsc-dataseed.binance.org/");
const axios = require('axios')
const app = express()
const cors = require ('cors')
const port = process.env.PORT

const pancakeSwapFactoryAddressV2 = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

app.use(cors());
app.options('*', cors())

app.get('/', (req, res) => {
  res.send('Utopia Dex Liquidity Calcaultor')
})

// Returns associated limit orders for orderer address
app.get('/liquidity/:tokenA/:tokenB', async(req, res) => {

  var pancakeSwapFactoryV2ABI = await getABI(pancakeSwapFactoryAddressV2)
    
  var pancakeSwapFactoryV2Contract = new web3.eth.Contract(JSON.parse(pancakeSwapFactoryV2ABI), pancakeSwapFactoryAddressV2)

  var tokenPairAddress = await pancakeSwapFactoryV2Contract.methods.getPair(req.params.tokenA, req.params.tokenB).call()

  var tokenPairABI = await getABI(tokenPairAddress)

  var tokenPairContract = await new web3.eth.Contract(JSON.parse(tokenPairABI), tokenPairAddress)

  var tokenPairLiquidity = await tokenPairContract.methods.getReserves().call();

  console.log(tokenPairLiquidity);
  res.send({
    tokenA: tokenPairLiquidity._reserve0,
    tokenB: tokenPairLiquidity._reserve1,
  });

  
})

app.get('/health', (req, res) => res.send("Healthy"));

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})

async function getABI(address) {
  const res = await axios.get('https://api.bscscan.com/api', {
    params: {
        module: 'contract',
        action: 'getabi',
        address: address,
        apiKey: 'IEXFMZMTEFKY351A7BG72V18TQE2VS74J1',
    },
  })
  return res.data.result
}