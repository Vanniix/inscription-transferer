# Inscription Transferer
This script is used to generate and broadcast bitcoin transactions that bulk transfer inscriptions contained within
a single address.

## Setup
### Node.js
To use, you must have node and npm installed. To check, run `node -v` and `npm -v`. If either doesn't work, you need
to install node, which is available here: [https://nodejs.org/en/download](https://nodejs.org/en/download)

### Package installation
Run `npm i` to install required dependencies for the script.

## Usage
To run the script, simply run `npm run transfer`. You will be given some details about the transaction before it is 
broadcast, and the script will ask for confirmation before broadcasting.

### Variables
The file `main.mts` contains all the variables that need to be set to run the script. The variables that need to be set
are in all caps near the top of the file.
- MNEMONIC: This is the seed phrase of the wallet containing the inscriptions. Each word is separated be a space. 
Note: this wallet must contain both the inscriptions, and the funds required to cover fees, however they can be in 
different addresses.
- ACCOUNT: This is the account within the wallet containing the inscriptions. This is most likely going to be 0, 
unless you have created multiple accounts with this wallet. e.g. if you are using Xverse, and are using the 3rd account,
then set account to 2 (accounts are zero indexed, so they are off by one from what you would see in Xverse).
- INSCRIPTIONS_ADDRESS: The address that contains all the inscriptions.
- FUNDS_ADDRESS: The address containing spare bitcoin to be used to cover the fee of the transaction.
- FUNDS_SATPOINT: This is the satpoint of the UTXO you want to use for fees. It will look something like this: `a97465a8c3ea430688e50c7576206e1985881a3110d4c701a14322820dde0d0d:0`. i.e. A transaction id, and the output index separated by a colon. This single UTXO needs to have enough bitcoin to cover fees. If you are transfering `x` inscriptions at a fee 
rate of `r`, you will need roughly `100 * x * f` sats in this UTXO.
- INPUT_FILE: The path to the csv file containing the inscription ID's and addresses. See below for details on the format.
- FEE_RATE: The fee rate of the transaction.
- BATCH: This is used if you need to send a lot of inscriptions, and you need to do it in multiple batches. See below for details.

### CSV File
The csv input file contains all the inscription ID's and addresses to transfer them to. This must contain at least 
two columns, one for inscription ID's containing the header `id`, and one for addresses containing the header `address`.
It does not matter which columns these are in, or if there are additional columns, so long as these two columns exist, 
and have the correct header.

An example csv file is included in this repository for reference.

### Batching
If your csv file has more ids than can be sent in a single transaction, you will need to batch the transactions. 

To do multiple batches, you will need to run the script multiple times. Start with the `BATCH` variable set to 0, and 
each time you run the script, increase it by one. This variable is used to determine which ids/addresses to use out of 
the csv file. Each time you run the script, you will need to update the `FUNDS_SATPOINT` as it is spent each time. If
you are using the same utxo for fees each time, you will need to wait for the previous transaction to confirm before
running it again, otherwise you will hit the mempool descendent chain size limit, as the transactions are close to the 
transaction size limit.

You can modify the batch size by changing the `BATCH_SIZE` variable in the `constants.mts` file. By default it is set 
to 700. You hit the 101kvB transaction size limit at a batch size of roughly 1000, but to be safe I would not go 
above 900. 