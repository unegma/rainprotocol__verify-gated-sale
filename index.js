import { ethers } from "ethers";
import deployVerify from "./deployVerify.js";
import deployVerifyTier from "./deployVerifyTier.js";
import deploySale from "./deploySale.js";
const CHAIN_ID = 80001; // Mumbai (Polygon Testnet) Chain ID
const ERC20_DECIMALS = 18; // See here for more info: https://docs.openzeppelin.com/contracts/3.x/erc20#a-note-on-decimals

// tutorial:
export async function runVerifyGatedSale() {
  try {
    const {ethereum} = window;

    if (!ethereum) {
      console.log("No Web3 Wallet installed");
    }

    const provider = new ethers.providers.Web3Provider(ethereum, {
      name: 'Mumbai',
      chainId: CHAIN_ID,
    });

    // Prompt user for account connections
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    console.log("Info: Your Account Address:", address);
    console.log('------------------------------'); // separator

    // Deploy Contracts
    const verifyContract = await deployVerify(signer); // Deploy Verify
    const verifyTierContract = await deployVerifyTier(signer, verifyContract); // Deploy Verify Tier Contract to be used in Sale
    const saleContract = await deploySale(signer, verifyTierContract); // Deploy Sale
    console.log('------------------------------'); // separator

    // ### Interact with the newly deployed ecosystem

    // TODO DOES THIS NEED TO BE THE SAME AS minimumUnits and desiredUnits
    let price = await saleContract.calculatePrice(ethers.utils.parseUnits("10", ERC20_DECIMALS)); // THIS WILL CALCULATE THE PRICE FOR **YOU** AND WILL TAKE INTO CONSIDERATION THE WALLETCAP, if the wallet cap is passed, the price will be so high that the user can't buy the token (you will see a really long number)
    console.log(`Info: Price of tokens in the Sale: ${price}`); // todo check the price is correct

    // configure buy for the sale (We have set this to Matic which is also used for paying gas fees, but this could easily be set to usdcc or some other token)
    const buyConfig = {
      feeRecipient: address,
      fee: 0, // TODO IS THIS NEEDED TO BE toNumber(). no // todo why does this work as 0.1 if eth doesn't have decimals
      minimumUnits: 1,
      desiredUnits: 1,
      maximumPrice: 1, // 0.01 matic? // TODO VERY ARBITRARY ETHERS CONSTANT MAX AMOUNT // todo why do we set this? // TODO IS THIS NEEDED TO BE toNumber()
    }

    try { // separate try block as we want to catch the error separately
      console.log(`Info: Buying from Sale with parameters:`, buyConfig);
      await saleContract.buy(buyConfig); // this should trigger the catch below
    } catch (err) {
      console.log(`Info: This should have failed because you haven't been verified to take part`, err); // console log the error which should be a revert
      console.log('------------------------------'); // separator
    }

    console.log(`Granting you the APPROVER role.`);
    const grantResult = await verifyContract.grantRole('APPROVER', address); // todo may need to give self approver role
    console.log(`Info: Grant result:`, grantResult);

    console.log(`Info: Approving You:`);
    const approvalResult = await verifyContract.approve([{
      account: address,
      data: 'ARBITRARY_IPFS_HASH'
    }])
    console.log(`Result: of Approval:`, approvalResult);

    console.log(`Info: Buying from Sale with parameters:`, buyConfig);
    const buyStatus = await saleContract.buy(buyConfig);
    console.log(`Info: This should have passed because you have passed the verification required to take part`, buyStatus);

    console.log('------------------------------'); // separator
    console.log("Info: Done");

  } catch (err) {
    // separator
    console.log('------------------------------');
    console.log(`Info: Something went wrong:`, err);
  }
}

runVerifyGatedSale();
