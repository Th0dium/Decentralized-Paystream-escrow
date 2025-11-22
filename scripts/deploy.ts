import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Paystream contract...");

  // Lấy đối tượng ContractFactory cho hợp đồng Paystream
  const Paystream = await ethers.getContractFactory("Paystream");

  // Gửi giao dịch để triển khai hợp đồng
  const paystream = await Paystream.deploy();

  // Chờ cho đến khi giao dịch được khai thác và hợp đồng được triển khai hoàn tất
  await paystream.waitForDeployment();

  // In địa chỉ của hợp đồng đã triển khai
  console.log(`Paystream deployed to: ${paystream.target}`);
}

// Chúng ta đề xuất sử dụng pattern này để có thể dùng async/await ở mọi nơi
// và xử lý lỗi một cách chính xác.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});