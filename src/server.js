require('dotenv').config()

const express = require('express')
const Web3 = require("web3")
const web3 = new Web3("https://bsc-dataseed.binance.org/");
const axios = require('axios')
const app = express()
const cors = require('cors')
const port = process.env.PORT

const Moralis = require('moralis/node');

Moralis.initialize("GE5JyXV3vDB89irEPsgb3DSdYbiw4XYRzeHgySm2");
Moralis.serverURL = 'https://zbconyrwn1pv.moralishost.com:2053/server'

const pancakeSwapFactoryAddressV2 = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

app.use(cors());
app.options('*', cors())

app.get('/', (req, res) => {
  res.send('Utopia Dex Liquidity Calcaultor')
})

// Returns associated limit orders for orderer address
app.get('/liquidity/:tokenA/:tokenB', async (req, res) => {

  try {
    const tokenAAddress = req.params.tokenA;
    const tokenBAddress = req.params.tokenB;
  
    const tokenAOptions = {
      address: tokenAAddress,
      chain: "bsc",
      exchange: "PancakeSwapv2"
    };
  
    const tokenADetails = await Moralis.Web3API.token.getTokenPrice(tokenAOptions);
  
    const tokenBOptions = {
      address: tokenBAddress,
      chain: "bsc",
      exchange: "PancakeSwapv2"
    };
  
    const tokenBDetails = await Moralis.Web3API.token.getTokenPrice(tokenBOptions);
  
    const tokenAABI = await getABI(tokenAAddress)
    const tokenAContract = await new web3.eth.Contract(JSON.parse(tokenAABI), tokenAAddress)
    const tokenADecimals = await tokenAContract.methods.decimals().call();
  
    const tokenBABI = await getABI(tokenBAddress)
    const tokenBContract = await new web3.eth.Contract(JSON.parse(tokenBABI), tokenBAddress)
    const tokenBDecimals = await tokenBContract.methods.decimals().call();
  
    const pancakeSwapFactoryV2ABI = await getABI(pancakeSwapFactoryAddressV2)
  
    const pancakeSwapFactoryV2Contract = new web3.eth.Contract(JSON.parse(pancakeSwapFactoryV2ABI), pancakeSwapFactoryAddressV2)
  
    const tokenPairAddress = await pancakeSwapFactoryV2Contract.methods.getPair(tokenAAddress, tokenBAddress).call()
  
    const tokenPairABI = await getABI(tokenPairAddress)
  
    const tokenPairContract = await new web3.eth.Contract(JSON.parse(tokenPairABI), tokenPairAddress)
  
    const tokenPairLiquidity = await tokenPairContract.methods.getReserves().call();
  
    const tokenAValue = tokenADetails.usdPrice * tokenPairLiquidity._reserve0 / 10 ** tokenADecimals 
    const tokenBValue = tokenBDetails.usdPrice * tokenPairLiquidity._reserve1 / 10 ** tokenBDecimals 
  
    res.send(JSON.stringify(tokenAValue + tokenBValue));
  } catch (error) {
    console.error(error);
    res.send(JSON.stringify("Server error. Please try again"));
  }

  

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