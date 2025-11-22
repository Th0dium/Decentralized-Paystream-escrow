import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying Paystream contract...");

  // Lấy đối tượng ContractFactory cho hợp đồng Paystream
  const Paystream = await ethers.getContractFactory("Paystream");

  // Gửi giao dịch để triển khai hợp đồng
  const paystream = await Paystream.deploy();

  // Chờ cho đến khi giao dịch được khai thác và hợp đồng được triển khai hoàn tất
  await paystream.waitForDeployment();

  const address = paystream.target;
  // In địa chỉ của hợp đồng đã triển khai
  console.log(`Paystream deployed to: ${address}`);

  // Save the contract address
  saveAddress(address);
}

function saveAddress(address: string) {
  const hre = require("hardhat");
  const networkName = hre.network.name;

  const filePath = path.join(__dirname, "..", "deployed-contracts.json");

  let deployments: any = {};
  if (fs.existsSync(filePath)) {
    try {
      deployments = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
      console.error("Error reading deployed-contracts.json", e);
    }
  }

  // Ensure the network entry exists
  if (!deployments[networkName]) {
    deployments[networkName] = {};
  }

  deployments[networkName].Paystream = address;

  try {
    fs.writeFileSync(filePath, JSON.stringify(deployments, null, 2));
    console.log(`Contract address saved to ${filePath}`);
  } catch (e) {
    console.error("Error writing to deployed-contracts.json", e);
  }
}


// Chúng ta đề xuất sử dụng pattern này để có thể dùng async/await ở mọi nơi
// và xử lý lỗi một cách chính xác.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});