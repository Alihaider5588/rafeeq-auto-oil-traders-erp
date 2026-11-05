# Rafiq Auto & Oil Traders - Local Shop PC Setup Guide (آف لائن POS گائیڈ)

Yeh guide dukan ke computer par bina internet aur bijli ke out hone par POS chalane aur sham ko Neon Cloud par data sync karne ke liye hai.

---

## 🚀 Client ke PC par Setup Kaise Karein (Sirf 5 Minute):

### Step 1: Zaroori Software (Prerequisites)
Client ke PC par sirf yeh 2 aam software install hone chahiye:
1. **Node.js (LTS Version):** [https://nodejs.org](https://nodejs.org) se download kar ke *Next -> Next -> Finish* karein.
2. **Google Chrome:** (Aam browser jo pehle se har computer mein hota hai).

---

### Step 2: Project Folder Copy Karein
* Yeh poora project folder USB ke zariye ya AnyDesk se client ke computer ki Drive `D:\` ya `C:\` mein rakh dein.

---

### Step 3: `1_CLICK_SETUP.bat` Chalaein
* Project folder ke andar **`1_CLICK_SETUP.bat`** par double click karein.
* Yeh script khud ba khud:
  * Zaroori files download karegi.
  * Local SQLite offline database tayyar karegi.
  * Aur client ke **Desktop par "Rafiq Auto POS" ka shortcut icon** bana degi.

---

### Step 4: Pehli dafa Cloud se Data Download Karein (Initial Seed)
* Desktop par bane **"Rafiq Auto POS"** icon ko kholein.
* Login karein:
  * **Username:** `admin` (ya operator)
  * **Password:** `Admin@12345`
* Top bar mein **`🔄 Cloud Sync`** button par click karein.
* 10 second mein tamam live Products, Customers, aur Rates Cloud se utar kar local computer mein save ho jayenge.

---

## 💼 Rozana ka Aasan Tareeqa-e-Kaar:

1. **Subah:**
   * Computer on kiya -> Desktop par **"Rafiq Auto POS"** par click kiya.
   * Sara din bina internet ke super-fast billing karein.

2. **Bijli ya Net Outage:**
   * Agar router band ho ya bijli chali jaye aur computer UPS par ho, tab bhi POS 100% normal chalta rahega.

3. **Sham ko Cloud Sync:**
   * Dukan badhane se pehle screen ke top bar mein **`🔄 Cloud Sync`** ka button dabayein.
   * Sara din ka data 5-10 second mein Neon Cloud par chala jayega aur Admin apne mobile se tamam hisaab live dekh sake ga.

---

## 🔄 Future Updates:
* Jab bhi koi naya feature aaye, sirf **`UPDATE_POS.bat`** par double click karein.
* 20 second mein system update ho jayega aur purana data 100% mehfooz rahega.
