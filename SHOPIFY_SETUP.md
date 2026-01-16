# Shopify Access Token পাওয়ার Guide

## 📋 Step-by-Step Instructions

### 1️⃣ Shopify Admin এ Login করুন
- https://admin.shopify.com/store/your-store-name এ যান
- আপনার Shopify store credentials দিয়ে login করুন

### 2️⃣ Apps Section এ যান
- Left sidebar থেকে **Settings** → **Apps and sales channels** click করুন
- অথবা সরাসরি **Apps** menu থেকে যান

### 3️⃣ Develop Apps Section
- Page এর নিচে **"Develop apps"** section এ যান
- **"Create an app"** button click করুন

### 4️⃣ App তৈরি করুন
- **App name**: দিন (যেমন: "ReviewAI Integration" বা "Review Analyzer")
- **App developer**: আপনার নাম/email
- **Create app** button click করুন

### 5️⃣ API Scopes Configure করুন
- App তৈরি হওয়ার পর **"Configure Admin API scopes"** click করুন
- এই scopes enable করুন:
  - ✅ **`read_products`** - Products পড়ার জন্য (required)
  - ✅ **`read_content`** - Content/Metafields পড়ার জন্য (required)
  - ✅ **`read_customers`** - Customer info (optional)
- **Save** button click করুন

### 6️⃣ App Install করুন
- **"Install app"** button click করুন
- Confirmation dialog এ **"Install"** confirm করুন

### 7️⃣ Access Token Copy করুন
- **"API credentials"** tab এ যান
- **"Admin API access token"** section এ **"Reveal token once"** button click করুন
- Token copy করুন (format: `shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- ⚠️ **Important**: Token শুধু একবার দেখানো হবে! Copy করে safe জায়গায় save করুন

### 8️⃣ Dashboard এ Use করুন
- Dashboard এ **"Connect Shopify"** button click করুন
- **Store Domain**: আপনার store domain দিন (যেমন: `mystore.myshopify.com`)
- **Access Token**: Copy করা token paste করুন
- **Save & Fetch Reviews** click করুন

---

## 🔒 Security Tips

1. **Token কখনো share করবেন না** - এটা sensitive credential
2. **Token GitHub এ commit করবেন না** - `.env` file use করুন
3. **Token expire হলে** - নতুন token generate করতে হবে
4. **App delete করলে** - Token automatically invalid হয়ে যাবে

---

## ❓ Common Issues

### Token কাজ করছে না?
- ✅ Token format check করুন: `shpat_` দিয়ে শুরু হতে হবে
- ✅ Scopes enable করা আছে কিনা check করুন
- ✅ App install করা আছে কিনা verify করুন
- ✅ Token copy করার সময় space/extra character আছে কিনা check করুন

### "Unauthorized" Error?
- Token expire হয়ে গেছে - নতুন token generate করুন
- Scopes properly set করা নেই - `read_products` এবং `read_content` enable করুন

### Store Domain Format?
- Correct: `mystore.myshopify.com`
- Wrong: `https://mystore.myshopify.com` (https:// দেবেন না)
- Wrong: `mystore.com` (.myshopify.com থাকতে হবে)

---

## 📞 Help

যদি কোনো problem হয়:
1. Browser console check করুন (F12 → Console)
2. Backend logs check করুন
3. Shopify Admin → Apps → আপনার app → API credentials verify করুন

---

## ✅ Checklist

- [ ] Shopify Admin এ login করা হয়েছে
- [ ] App তৈরি করা হয়েছে
- [ ] API scopes enable করা হয়েছে (`read_products`, `read_content`)
- [ ] App install করা হয়েছে
- [ ] Access token copy করা হয়েছে
- [ ] Dashboard এ store domain এবং token দেয়া হয়েছে
- [ ] Reviews successfully fetch হচ্ছে

---

**Happy Analyzing! 🎉**

