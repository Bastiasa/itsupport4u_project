import puppeteer, { Browser } from "puppeteer";
import fs from 'fs/promises';
import { resolve } from "path";

const FARAZ_AHMAD_CREDLY = "https://www.credly.com/users/faraz-ahmad.a5935bd3/badges#credly";
const FARAZ_AHMAD_WALLET = "https://www.credential.net/profile/farazahmad283861/wallet";

const CREDLY_CERTIFICATION_CONTAINER_SELECTOR = ".Cardstyles__StyledContainer-fredly__sc-1yaakoz-0.fRJHRP.EarnedBadgeCardstyles__StyledCard-fredly__sc-gsqjwh-1.jwtiVz";
const CREDLY_CERTIFICATION_IMAGE_SELECTOR = ".EarnedBadgeCardstyles__ImageContainer-fredly__sc-gsqjwh-0.dDMlBy"
const CREDLY_CERTIFICATION_NAME_SELECTOR = ".Typographystyles__Container-fredly__sc-1jldzrm-0.enJnLg.EarnedBadgeCardstyles__BadgeNameText-fredly__sc-gsqjwh-7.hqrelZ"

const WALLET_CERTIFICATION_CONTAINER_SELECTOR = ".wallet-container .tile-gallery .cdk-drop-list.tile.cdk-drop-list-disabled.ng-star-inserted"
const WALLET_CERTIFICATION_CUSTOM_CREDENTIAL_COVER_ELEMENT = ".custom-credential.ng-star-inserted.ng-lazyloaded"
const WALLET_CERTIFICATION_SCREENSHOT_COVER_SELECTOR = `${WALLET_CERTIFICATION_CONTAINER_SELECTOR} .certificate.us-letter.default.landscape`;
const WALLET_CERTIFICATION_IMAGE_SELECTOR = `svg image, ${WALLET_CERTIFICATION_CONTAINER_SELECTOR} img.ng-lazyloaded`;
const WALLET_CERTIFICATION_NAME_SELECTOR = ".details .mat-h3";
const WALLET_CERTIFICATION_LINK_SELECTOR = `${WALLET_CERTIFICATION_CONTAINER_SELECTOR} a.ng-star-inserted`


const execArgv = process.argv.slice(2);


async function scrapCredly(browser: Browser) {

    console.log("Starting credly scrap...");

    const page = await browser.newPage();

    await page.goto(FARAZ_AHMAD_CREDLY, { waitUntil: "load" });


    await page.waitForSelector(CREDLY_CERTIFICATION_CONTAINER_SELECTOR);
    await page.waitForSelector(CREDLY_CERTIFICATION_IMAGE_SELECTOR);
    await page.waitForSelector(CREDLY_CERTIFICATION_NAME_SELECTOR);

    console.log("Credly website stuff loaded.");


    const badges = await page.$$eval(
        CREDLY_CERTIFICATION_CONTAINER_SELECTOR,
        (elements, { imageClass, nameClass }) => {
            return elements.map(element => {
                const IMAGE_ELEMENT = element.querySelector(imageClass) as HTMLImageElement;
                const NAME_ELEMENT = element.querySelector(nameClass) as HTMLSpanElement;

                return {
                    imageUrl: IMAGE_ELEMENT.src,
                    badgeUrl: element.getAttribute("href")?.substring("/badges/".length),
                    name: NAME_ELEMENT.textContent
                };
            });
        },
        {
            imageClass: CREDLY_CERTIFICATION_IMAGE_SELECTOR,
            nameClass: CREDLY_CERTIFICATION_NAME_SELECTOR
        }
    );

    console.log("Credly scrapping finished.");
    console.log(`${badges.length} badges were scrapped.`);

    await fs.writeFile("webscrapping/credly_badges.json", JSON.stringify(badges), "utf8")
}


async function scrapWallet(browser: Browser) {

    console.log("Starting wallet scrapping...");


    const page = await browser.newPage();

    await page.goto(FARAZ_AHMAD_WALLET, {
        waitUntil: 'load'
    });


    await page.waitForSelector(WALLET_CERTIFICATION_CONTAINER_SELECTOR);
    await page.waitForSelector(WALLET_CERTIFICATION_IMAGE_SELECTOR);
    await page.waitForSelector(WALLET_CERTIFICATION_NAME_SELECTOR);
    await page.waitForSelector(WALLET_CERTIFICATION_LINK_SELECTOR);

    const BADGES_COUNT_STRING = await page.$eval('span[_ngcontent-ng-c2957083266]', el => el.textContent);

    if (BADGES_COUNT_STRING) {
        const BADGES_COUNT = parseInt(BADGES_COUNT_STRING.split(" ")[0], 10);

        if (isFinite(BADGES_COUNT)) {
            console.log("Waiting for the badges count to coincide...");

            while (true) {

                await page.evaluate(() => {
                    const scroller = document.querySelector(".mat-drawer-content.mat-sidenav-content");
                    scroller?.scrollTo(0, scroller?.scrollHeight)
                })
                const LOADED_BADGES = await page.$$eval(WALLET_CERTIFICATION_CONTAINER_SELECTOR, els => els.length);

                if (LOADED_BADGES >= BADGES_COUNT) {
                    break;
                }

                await new Promise<void>(resolve => setTimeout(resolve, 15));
            }

            console.log("Badges count now coincide!");

        }
    } else {
        console.log("Badges count element couldn't be found.");

    }


    console.log("Wallet website loaded...");

    type CertificationsData = { name: string, link: string, imageUrl: string | null | ":" };
    type Certifications = (CertificationsData)[];

    let CERTIFICATIONS: Certifications = await page.$$eval(
        WALLET_CERTIFICATION_CONTAINER_SELECTOR,
        (elements, { imageSelector, nameSelector, linkSelector, customCoverSelector, screenshotCoverSelector }) => {

            return elements.map((certificationContainer, index) => {
                const NAME_ELEMENT = certificationContainer.querySelector(nameSelector);
                const LINK_ELEMENT = certificationContainer.querySelector(linkSelector) as HTMLAnchorElement;

                console.log("Catching...", certificationContainer);


                try {

                    let imageUrl: string | null = "";
                    let imageElement = certificationContainer.querySelector(imageSelector);

                    if (imageElement != null) {
                        imageUrl = imageElement.getAttribute('xlink:href') ?? imageElement.getAttribute("src");
                    } else {
                        imageElement = certificationContainer.querySelector(customCoverSelector);

                        if (imageElement != null) {
                            const BACKGROUND_IMAGE_PROPERTY = getComputedStyle(imageElement).backgroundImage;
                            const match = BACKGROUND_IMAGE_PROPERTY.match(/^url\(["']?(.*?)["']?\)$/);
                            imageUrl = match ? match[1] : null;

                        } else {

                            imageElement = certificationContainer.querySelector(screenshotCoverSelector);

                            if (imageElement != null) {
                                const id = `screenshot-target-${index.toString(32)}`;
                                console.log("ID of", imageElement, "setted to", id);
                                imageElement.setAttribute("id", id);
                                imageUrl = `:${id}`;


                            }
                        }
                    }

                    return {
                        name: NAME_ELEMENT?.textContent,
                        link: LINK_ELEMENT.href.substring("https://www.credential.net/".length),
                        imageUrl
                    };
                } catch (err) {
                    return null;
                }


            })

        },
        {
            customCoverSelector: WALLET_CERTIFICATION_CUSTOM_CREDENTIAL_COVER_ELEMENT,
            imageSelector: WALLET_CERTIFICATION_IMAGE_SELECTOR,
            nameSelector: WALLET_CERTIFICATION_NAME_SELECTOR,
            linkSelector: WALLET_CERTIFICATION_LINK_SELECTOR,
            screenshotCoverSelector: WALLET_CERTIFICATION_SCREENSHOT_COVER_SELECTOR
        }
    ) as Certifications;


    for (const index in CERTIFICATIONS) {
        const cert = CERTIFICATIONS[index];

        if (cert.imageUrl?.startsWith(":")) {

            const id = cert.imageUrl.substring(1);
            const foundElement = await page.$(`#${id}`);

            if (foundElement == null) {
                console.warn("Couldn't take the screenshot of", cert);
                continue
            }

            const BASE64_IMAGE_DATA = Buffer.from(await foundElement.screenshot()).toString('base64');
            cert.imageUrl = `data:image/png;base64,${BASE64_IMAGE_DATA}`;

            console.log("Screenshot taken for a certification.");


        }
    }

    CERTIFICATIONS = CERTIFICATIONS.filter(c => c !== null);

    console.log("Wallet scrapping finished.");
    console.log(`${CERTIFICATIONS.length} were scrapped.`);

    await fs.writeFile("webscrapping/wallet_badges.json", JSON.stringify(CERTIFICATIONS), 'utf8');
}

async function main() {
    await fs.mkdir("webscrapping/", { recursive: true });

    const browser = await puppeteer.launch({
        headless: execArgv.includes('--headless'),
        slowMo: 0
    });

    const processes: Promise<void>[] = [];

    const startProcess = (process: (browser: Browser) => Promise<void>) => {
        processes.push(process(browser));
    }


    if (execArgv.includes("--credly")) {
        startProcess(scrapCredly)
    }

    if (execArgv.includes("--wallet")) {
        startProcess(scrapWallet)
    }

    if (processes.length <= 0) {
        const COMMANDS = ['--credly', '--wallet'];
        console.log(`You should input at least of the social media to scrap:\n\n${COMMANDS.join('\n')}\n`);
        await browser.close();
        return;
    }

    await Promise.all(processes);

    await browser.close();

    console.log("Finished.\n");
    process.exit(0);

}

main();