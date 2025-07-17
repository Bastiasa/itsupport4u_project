# itsupport4u_project — Web Scraper for Credly & Accredible Wallet

This project performs web scraping of **Faraz Ahmad’s** certifications from two platforms:

- [Credly](https://www.credly.com/users/faraz-ahmad.a5935bd3/badges#credly)
- [Accredible Wallet](https://www.credential.net/profile/farazahmad283861/wallet)

The goal is to extract certification data and export it to JSON files for use in a website or web app.

---

## ⚙️ Technologies Used

- [Node.js](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Puppeteer](https://pptr.dev/) — for browser automation and scraping
- `fs/promises` — for async file system handling

---

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/Bastiasa/itsupport4u_project.git
    cd itsupport4u_project
    ```

2. Install dependencies:
    ```
    npm install
    ```

3. Remember having tsc installed:
    ```
    npm install tsc
    ```


## Usage

```
npm run dev [--credly] [--wallet] [--headless]
```

## Options

- ```--headless``` - Doesn't display the web browser.
- ```--credly``` - Scraps Credly credentials.
- ```--accredible``` - Scraps Accredibble credentials.
