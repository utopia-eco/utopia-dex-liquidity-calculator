require('dotenv').config()

const express = require('express')
const Web3 = require("web3")

const web3Providers = ["https://bsc-dataseed.binance.org/",
                      "https://bsc-dataseed1.defibit.io/",
                      "https://bsc-dataseed1.ninicoin.io/",
                      "https://bsc-dataseed2.defibit.io/",
                      "https://bsc-dataseed3.defibit.io/"
                      ]

const axios = require('axios')
const Cache = require('timed-cache')
const app = express()
const cors = require('cors')
const port = process.env.PORT
var cache = new Cache({ defaultTtl: 150 * 1000 });

const Moralis = require('moralis/node');

// <<<<<<< HEAD
// const serverUrl = 'https://zbconyrwn1pv.moralishost.com:2053/server';
// const appId = 'GE5JyXV3vDB89irEPsgb3DSdYbiw4XYRzeHgySm2';

// const serverUrl = 'https://8byfolfnprmm.usemoralis.com:2053/server';
// const appId = 'WK2Bg7yALwSkrIOqk7h5oA91ZXfvDcO3Mdfb1vOF';

const serverUrl = 'https://v2lz31nmrv4a.usemoralis.com:2053/server';
const appId = 'c2YpyMVhR0Kg1Oyjw0AuwFAnv3DcqmtDAmp8o3Wne4m9V2gUg47fjSjZLbgg8ZNs';

Moralis.start({serverUrl, appId});

// Moralis.initialize("GE5JyXV3vDB89irEPsgb3DSdYbiw4XYRzeHgySm2");
// Moralis.serverURL = 'https://zbconyrwn1pv.moralishost.com:2053/server'
// =======
// Moralis.initialize("c2YpyMVhR0Kg1Oyjw0AuwFAnv3DcqmtDAmp8o3Wne4m9V2gUg47fjSjZLbgg8ZNs");
// Moralis.serverURL = 'https://v2lz31nmrv4a.usemoralis.com:2053/server'
// >>>>>>> origin/master

const pancakeSwapFactoryAddressV2 = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";

web3ProviderChoice = 0;

app.use(cors());
app.options('*', cors())

app.get('/', (req, res) => {
  res.send('Utopia Dex Liquidity Calcaultor')
})

// Returns associated limit orders for orderer address
app.get('/liquidity/:tokenA/:tokenB', async (req, res) => {

  var tokenAAddress = req.params.tokenA;
  var tokenBAddress = req.params.tokenB;

  timeLimit = 15000; // 10 second time limit to retrieve price
      
  try {
    const result = await fulfillWithTimeLimit(timeLimit, retrieveLiquidity(tokenAAddress, tokenBAddress, web3Providers[web3ProviderChoice]));
    res.send(result);
  } catch(error) {
    console.error("error initializing price updater for token", error);
    res.json("Error retrieving price")
  }
})

app.get('/health', (req, res) => res.send("Healthy"));

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
})

async function fulfillWithTimeLimit(timeLimit, task, web3ProviderChoice){
  let timeout;
  const timeoutPromise = new Promise((resolve, reject) => {
      timeout = setTimeout(() => {
          console.error("web3Provider is not responding after 15 seconds", web3Providers[web3ProviderChoice]);
          web3ProviderChoice = (web3ProviderChoice + 1) % web3Providers.length;
          console.error("Using this web3 provider now", web3Providers[web3ProviderChoice])
      }, timeLimit);
  });
  const response = await Promise.race([task, timeoutPromise]);
  if(timeout){ //the code works without this but let's be safe and clean up the timeout
      clearTimeout(timeout);
  }
  return response;
}

async function retrieveLiquidity(tokenAAddress, tokenBAddress, web3ProviderChoice) {
  try {

    console.log(web3ProviderChoice);
    const web3 = new Web3(web3ProviderChoice);

    if (tokenAAddress > tokenBAddress) {
      [tokenAAddress, tokenBAddress] = [tokenBAddress, tokenAAddress]
    }
  
    const tokenAOptions = {
      address: tokenAAddress,
      chain: "bsc",
      exchange: "PancakeSwapv2"
    };
  
    let tokenADetails;
    if (cache.get(tokenAAddress)) {
      tokenADetails = cache.get(tokenAAddress)
    } else {
      tokenADetails = await Moralis.Web3API.token.getTokenPrice(tokenAOptions);
      cache.put(tokenAAddress, tokenADetails)
    }
  
    const tokenBOptions = {
      address: tokenBAddress,
      chain: "bsc",
      exchange: "PancakeSwapv2"
    };
  
    let tokenBDetails;
    if (cache.get(tokenBAddress)) {
      tokenBDetails = cache.get(tokenBAddress)
    } else {
      tokenBDetails = await Moralis.Web3API.token.getTokenPrice(tokenBOptions);
      cache.put(tokenBAddress, tokenBDetails)
    }
  
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
  
    return JSON.stringify(tokenAValue + tokenBValue);
  } catch (error) {
    console.error(error);
    return JSON.stringify("Server error. Please try again");
  }
}

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