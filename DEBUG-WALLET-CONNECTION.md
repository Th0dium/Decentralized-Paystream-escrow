# Debug Wallet Connection Issue

## Vấn đề
Khi click nút "Connect MetaMask" không có gì xảy ra.

## Các bước debug

### 1. Kiểm tra console logs
Mở Developer Console (F12) và xem logs khi click nút connect:
- `🔌 Connect button clicked` - Xác nhận button được click
- `Available connectors` - Xem có connectors nào available
- `Looking for connector ID: injected` - ID mà code đang tìm
- `Found connector` - Connector có được tìm thấy không

### 2. Kiểm tra MetaMask
- Đảm bảo MetaMask extension đã được cài đặt
- Đảm bảo MetaMask đã được unlock
- Kiểm tra MetaMask có đang connect với đúng network không (Sepolia)

### 3. Kiểm tra RPC URL
File: `frontend/.env.local`
```
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xEdjPWL3Yc6MaDLNA1VWr
```

**⚠️ CẢNH BÁO**: RPC URL có vẻ chưa có API key đầy đủ. Cần:
1. Đăng nhập vào Alchemy
2. Tạo/copy API key đầy đủ
3. Update `NEXT_PUBLIC_RPC_URL` với key đầy đủ

### 4. Kiểm tra state logs
Console sẽ log ra state hiện tại:
```
🔍 Login Page State: {
  isHydrated: true/false,
  isAuthenticated: true/false,
  isConnected: true/false,
  isConnecting: true/false,
  isVerifying: true/false,
  hasAttemptedVerify: true/false,
  connectorsCount: number,
  hasError: true/false
}
```

### 5. Các vấn đề có thể xảy ra

#### A. Không có connectors
- `connectorsCount: 0` → MetaMask chưa được cài đặt hoặc chưa load
- **Giải pháp**: Cài đặt MetaMask và refresh page

#### B. Connector ID không match
- `Looking for connector ID: injected` nhưng không tìm thấy
- **Giải pháp**: Kiểm tra `WALLET_CONFIG.CONNECTOR_ID` trong `frontend/lib/constants.ts`

#### C. RPC URL không hợp lệ
- Wagmi không thể khởi tạo provider
- **Giải pháp**: Update RPC URL với Alchemy API key hợp lệ

#### D. Button không responsive
- Click không trigger function
- **Giải pháp**: Kiểm tra `isLoading` state có đang block button không

## Thứ tự fix

1. **Kiểm tra MetaMask**: Đảm bảo extension được cài và unlock
2. **Fix RPC URL**: Lấy Alchemy API key đầy đủ
3. **Restart dev server**: `npm run dev` trong thư mục frontend
4. **Clear browser cache**: Hard refresh (Ctrl+Shift+R)
5. **Test lại**: Click connect và check console logs

## Expected Flow

Khi mọi thứ hoạt động đúng:
```
1. User click "Connect MetaMask"
2. Console log: "🔌 Connect button clicked"
3. Console log: "Available connectors: [...]"
4. Console log: "Found connector: [object]"
5. Console log: "Attempting to connect..."
6. MetaMask popup xuất hiện
7. User approve connection
8. Auto-verify wallet with backend
9. Redirect to dashboard
```

## Next Steps

Sau khi xem console logs, reply với:
1. Screenshot của console logs
2. Trạng thái của MetaMask (installed/unlocked?)
3. Có popup nào xuất hiện không?
