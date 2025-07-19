import { Browser } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from "path";

const OUTPUT_FOLDER = "output";

// Target websites
const FARAZ_AHMAD_CREDLY = "https://www.credly.com/users/faraz-ahmad.a5935bd3/badges#credly";
const FARAZ_AHMAD_WALLET = "https://www.credential.net/profile/farazahmad283861/wallet";
const ITSUPPORT_UPWORK = " https://www.upwork.com/agencies/1659142272213975040/modal-members-list-slider?pageTitle=Agency%20members&preventDismiss=false&_modalInfo=%5B%7B%22navType%22%3A%22slider%22,%22title%22%3A%22Agency%20members%22,%22modalId%22%3A%221752864750077%22,%22channelName%22%3A%22modal-members-list-slider%22,%22preventDismiss%22%3Afalse%7D%5D";

// Credly selectors
const CREDLY_CERTIFICATION_CONTAINER_SELECTOR = ".Cardstyles__StyledContainer-fredly__sc-1yaakoz-0.fRJHRP.EarnedBadgeCardstyles__StyledCard-fredly__sc-gsqjwh-1.jwtiVz";
const CREDLY_CERTIFICATION_IMAGE_SELECTOR = ".EarnedBadgeCardstyles__ImageContainer-fredly__sc-gsqjwh-0.dDMlBy"
const CREDLY_CERTIFICATION_NAME_SELECTOR = ".Typographystyles__Container-fredly__sc-1jldzrm-0.enJnLg.EarnedBadgeCardstyles__BadgeNameText-fredly__sc-gsqjwh-7.hqrelZ"

// Accredible selectors
const ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR = ".wallet-container .tile-gallery .cdk-drop-list.tile.cdk-drop-list-disabled.ng-star-inserted"
const ACCREDIBLE_CERTIFICATION_CUSTOM_CREDENTIAL_COVER_ELEMENT = ".custom-credential.ng-star-inserted.ng-lazyloaded"
const ACCREDIBLE_CERTIFICATION_SCREENSHOT_COVER_SELECTOR = `${ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR} .certificate.us-letter.default.landscape`;
const ACCREDIBLE_CERTIFICATION_IMAGE_SELECTOR = `svg image, ${ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR} img.ng-lazyloaded`;
const ACCREDIBLE_CERTIFICATION_NAME_SELECTOR = ".details .mat-h3";
const ACCREDIBLE_CERTIFICATION_LINK_SELECTOR = `${ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR} a.ng-star-inserted`
const ACCREDIBLE_COOKIES_BUTTON = ".mat-focus-indicator.outline-alt.mat-raised-button.mat-button-base.mat-accent"

// Upwork selectors
const UPWORK_MEMBER_CONTAINER_SELECTOR = ".air3-card-section.d-flex.flex-column.p-6x";
const UPWORK_MEMBER_IMAGE_SELECTOR = `${UPWORK_MEMBER_CONTAINER_SELECTOR} img`;
const UPWORK_MEMBER_NAME_SELECTOR = `${UPWORK_MEMBER_CONTAINER_SELECTOR} a.up-n-link.ellipsis`;


// Arguments from the console
const execArgv = process.argv.slice(2);

// Patterns

const MIME_TYPE_EXTENSION = /^[a-z]+\/([a-z]+)$/;


// Check file existence
async function exists(path: string) {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

// Scrapping Credly badges 
async function scrapCredly(browser: Browser) {

    console.log("Starting credly scrap...");

    const page = await browser.newPage();

    await page.goto(FARAZ_AHMAD_CREDLY, { waitUntil: "load" });

    // Waiting for some elements to be loaded
    await page.waitForSelector(CREDLY_CERTIFICATION_CONTAINER_SELECTOR);
    await page.waitForSelector(CREDLY_CERTIFICATION_IMAGE_SELECTOR);
    await page.waitForSelector(CREDLY_CERTIFICATION_NAME_SELECTOR);

    console.log("Credly website stuff loaded.");

    // Obtaining every badge
    const BADGES = await page.$$eval(
        CREDLY_CERTIFICATION_CONTAINER_SELECTOR,
        (elements, { imageClass, nameClass }) => {
            return elements.map(element => {
                const IMAGE_ELEMENT = element.querySelector(imageClass) as HTMLImageElement;
                const NAME_ELEMENT = element.querySelector(nameClass) as HTMLSpanElement;

                return {
                    image: IMAGE_ELEMENT.src,
                    id: element.getAttribute("href")?.substring("/badges/".length),
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
    console.log(`${BADGES.length} badges were scrapped.`);

    console.log("Downlading images...");

    {
        const CREDLY_IMAGES_FOLDER = path.join(OUTPUT_FOLDER, "credly_images");

        if (await exists(CREDLY_IMAGES_FOLDER)) {
            await fs.rm(CREDLY_IMAGES_FOLDER, { recursive: true });
        }

        await fs.mkdir(CREDLY_IMAGES_FOLDER);
    }

    const IMAGES_DOWNLOAD_PROMISES = BADGES.map((badge, index) => {

        return new Promise<void>(async resolve => {

            const response = await fetch(badge.image);

            const mimeType = response.headers.get('content-type');
            let extension = mimeType?.match(MIME_TYPE_EXTENSION)?.[1];

            if (!extension) {
                console.log(`The image ${badge.image} doesn't have an extension. Given mimetype: ${mimeType}`);

                const URL_EXTENSION = badge.image.match(/^.*.(png|jpeg|jpg|gif|svg|webp)$/)?.[1];

                if (URL_EXTENSION) {
                    extension = URL_EXTENSION;
                }
            }

            const fileName = `${badge.id}-${index}.${extension ?? "unknown"}`;
            badge.image = fileName;

            const blob = await response.blob();

            await fs.writeFile(
                path.join(OUTPUT_FOLDER, "credly_images", fileName),
                Buffer.from(await blob.arrayBuffer()),
                'binary'
            );


            resolve();
        });

    });


    await Promise.all(IMAGES_DOWNLOAD_PROMISES);

    console.log("Images downloaded.");



    // Saving badges in a JSON file
    await fs.writeFile(
        path.join(OUTPUT_FOLDER, "credly_badges.json"),
        JSON.stringify(BADGES),
        "utf8"
    );
}


// Scrapping Accredible badges
async function scrapAccredible(browser: Browser) {

    console.log("Starting wallet scrapping...");


    const page = await browser.newPage();

    await page.goto(FARAZ_AHMAD_WALLET, {
        waitUntil: 'load'
    });


    // Waiting for some elements to be loaded

    await page.waitForSelector(ACCREDIBLE_COOKIES_BUTTON);
    await page.waitForSelector(ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR);
    await page.waitForSelector(ACCREDIBLE_CERTIFICATION_IMAGE_SELECTOR);
    await page.waitForSelector(ACCREDIBLE_CERTIFICATION_NAME_SELECTOR);
    await page.waitForSelector(ACCREDIBLE_CERTIFICATION_LINK_SELECTOR);

    const BADGES_COUNT_STRING = await page.$eval('span[_ngcontent-ng-c2957083266]', el => el.textContent);

    await page.click(ACCREDIBLE_COOKIES_BUTTON);

    // Looking the badges count upper label, if it's detected, then wait until the badges number is equivalent
    if (BADGES_COUNT_STRING) {
        const BADGES_COUNT = parseInt(BADGES_COUNT_STRING.split(" ")[0], 10);

        if (isFinite(BADGES_COUNT)) {
            console.log("Waiting for the badges count to coincide...");

            while (true) {

                await page.evaluate(() => {
                    // Scroll down to allow the badges to be loaded
                    const scroller = document.querySelector(".mat-drawer-content.mat-sidenav-content");
                    scroller?.scrollTo(0, scroller?.scrollHeight)
                })
                const LOADED_BADGES = await page.$$eval(ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR, els => els.length);

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

    type CertificationsData = { name: string, id: string, image: string | null | `:${string}` };
    type Certifications = (CertificationsData)[];

    let CERTIFICATIONS: Certifications = await page.$$eval(
        ACCREDIBLE_CERTIFICATION_CONTAINER_SELECTOR,
        (elements, { imageSelector, nameSelector, linkSelector, customCoverSelector, screenshotCoverSelector }) => {

            return elements.map((certificationContainer, index) => {
                //Getting constant elements
                const NAME_ELEMENT = certificationContainer.querySelector(nameSelector);
                const LINK_ELEMENT = certificationContainer.querySelector(linkSelector) as HTMLAnchorElement;

                console.log("Catching...", certificationContainer);


                try {

                    // Getting image url
                    // Images in Accredible are quirky to get

                    let image: string | null = "";
                    let imageElement = certificationContainer.querySelector(imageSelector);

                    if (imageElement != null) {
                        // Simple image getting
                        image = imageElement.getAttribute('xlink:href') ?? imageElement.getAttribute("src");
                    } else {
                        // If couldn't the simple way, then try a custom certification way
                        imageElement = certificationContainer.querySelector(customCoverSelector);

                        if (imageElement != null) {
                            const BACKGROUND_IMAGE_PROPERTY = getComputedStyle(imageElement).backgroundImage;
                            const match = BACKGROUND_IMAGE_PROPERTY.match(/^url\(["']?(.*?)["']?\)$/);
                            image = match ? match[1] : null;

                        } else {

                            // Even if it's not a custom certification, it will be taken a screenshot.
                            // So here we mark the target element for the screenshot

                            imageElement = certificationContainer.querySelector(screenshotCoverSelector);

                            if (imageElement != null) {
                                const id = `screenshot-target-${index.toString(32)}`;
                                console.log("ID of", imageElement, "setted to", id);
                                imageElement.setAttribute("id", id);
                                image = `:${id}`;


                            }
                        }
                    }

                    return {
                        name: NAME_ELEMENT?.textContent,
                        id: LINK_ELEMENT.href.substring("https://www.credential.net/".length),
                        image
                    };
                } catch (err) {
                    return null;
                }


            })

        },
        {
            customCoverSelector: ACCREDIBLE_CERTIFICATION_CUSTOM_CREDENTIAL_COVER_ELEMENT,
            imageSelector: ACCREDIBLE_CERTIFICATION_IMAGE_SELECTOR,
            nameSelector: ACCREDIBLE_CERTIFICATION_NAME_SELECTOR,
            linkSelector: ACCREDIBLE_CERTIFICATION_LINK_SELECTOR,
            screenshotCoverSelector: ACCREDIBLE_CERTIFICATION_SCREENSHOT_COVER_SELECTOR
        }
    ) as Certifications;


    // Here it verifies if some of the gotten certifications requires a screenshot
    for (const index in CERTIFICATIONS) {
        const cert = CERTIFICATIONS[index];

        if (cert.image?.startsWith(":")) {

            const id = cert.image.substring(1);
            const foundElement = await page.$(`#${id}`);

            if (foundElement == null) {
                console.warn("Couldn't take the screenshot of", cert);
                continue
            }

            const BASE64_IMAGE_DATA = Buffer.from(await foundElement.screenshot()).toString('base64');
            cert.image = `data:image/png;base64,${BASE64_IMAGE_DATA}`;

            console.log("Screenshot taken for a certification.");


        }
    }

    // Filtering possible null values
    CERTIFICATIONS = CERTIFICATIONS.filter(c => c !== null);

    const ACCREDIBLE_IMAGES_FOLDER = path.join(OUTPUT_FOLDER, "accredible_images");

    //Checking output folder
    {

        if (await exists(ACCREDIBLE_IMAGES_FOLDER)) {
            await fs.rm(ACCREDIBLE_IMAGES_FOLDER, { recursive: true });
        }

        await fs.mkdir(ACCREDIBLE_IMAGES_FOLDER, { recursive: true });
    }

    //Saving images files.

    const saveImagesPromises = CERTIFICATIONS.map((certification, index) => {
        if (!certification.image) {
            return new Promise<void>(resolve => resolve());
        }

        if (certification.image.startsWith("data:")) {

            return new Promise<void>(async resolve => {
                let [header, content] = certification.image!!.split(',', 2);

                const extension = header.match(/^data:image\/([a-z]+);base64$/)?.[1];
                const fileName = `${certification.id}-${index}.${extension}`;

                certification.image = fileName;
                await fs.writeFile(
                    path.join(ACCREDIBLE_IMAGES_FOLDER, fileName),
                    content,
                    "base64"
                );

                resolve();
            });


        } else if (certification.image.startsWith("http")) {

            return new Promise<void>(async resolve => {

                const response = await fetch(certification.image as string);
                const contentType = response.headers.get('content-type') as string;

                const extension = contentType?.match(MIME_TYPE_EXTENSION)?.[1];

                const fileName = `${certification.id}-${index}.${extension}`;
                const blob = await response.blob()

                certification.image = fileName;

                await fs.writeFile(
                    path.join(ACCREDIBLE_IMAGES_FOLDER, fileName),
                    Buffer.from(await blob.arrayBuffer()),
                    'binary'
                );

                resolve();
            });

        }
    });

    await Promise.all(saveImagesPromises);

    console.log("Wallet scrapping finished.");
    console.log(`${CERTIFICATIONS.length} were scrapped.`);

    await fs.writeFile(
        path.join(OUTPUT_FOLDER, "wallet_badges.json"),
        JSON.stringify(CERTIFICATIONS),
        'utf8'
    );
}

// Scrapping Upwork members
async function scrapUpworkMembers(browser: Browser) {

    //This is a basic scrap, no explanation needed.

    console.log("Starting Upwork scrapping.");


    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
    await page.goto(ITSUPPORT_UPWORK, {
        waitUntil: 'load'
    });

    await page.waitForSelector(UPWORK_MEMBER_CONTAINER_SELECTOR, { timeout: 90000 });


    console.log("Upwork necessary elements are loaded. Scrapping...");

    const MEMBERS_DATA = await page.$$eval(

        UPWORK_MEMBER_CONTAINER_SELECTOR,
        (elements, { imageSelector, nameSelector }) => {

            return elements.map(memberContainer => {
                const MEMBER_NAME = memberContainer.querySelector(nameSelector) as HTMLAnchorElement;
                const MEMBER_IMAGE = memberContainer.querySelector(imageSelector) as HTMLImageElement;

                return {
                    name: MEMBER_NAME.textContent,
                    image: MEMBER_IMAGE.src
                }
            });

        },

        {
            imageSelector: UPWORK_MEMBER_IMAGE_SELECTOR,
            nameSelector: UPWORK_MEMBER_NAME_SELECTOR
        }
    )

    console.log(`${MEMBERS_DATA.length} members gathered. Saving file...`);


    await fs.writeFile(
        path.join(OUTPUT_FOLDER, "upwork_members.json"),
        JSON.stringify(MEMBERS_DATA),
        'utf8'
    );

}

let activeBrowser: Browser;

// Main process
async function main() {
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true });

    const browser = await puppeteer.launch({
        headless: execArgv.includes('--headless'),
        slowMo: 0
    });

    activeBrowser = browser;

    const processes: Promise<void>[] = [];

    const startProcess = (process: (browser: Browser) => Promise<void>) => {
        processes.push(process(browser));
    }


    // Verifying the given arguments. If nothing was given, then exit the process.

    if (execArgv.includes("--credly")) {
        startProcess(scrapCredly);
    }

    if (execArgv.includes("--accredible")) {
        startProcess(scrapAccredible);
    }

    if (execArgv.includes("--upwork")) {
        startProcess(scrapUpworkMembers);
    }

    if (processes.length <= 0) {
        const COMMANDS = ['--credly', '--accredible'];
        console.log(`You should input at least of the social media to scrap:\n\n${COMMANDS.join('\n')}\n`);
        await browser.close();
        return;
    }

    await Promise.all(processes);

    await browser.close();

    console.log("Finished.\n");
    process.exit(0);

}


puppeteer.use(StealthPlugin());

main()
    .catch(async reason => {
        console.log("Ended scrap with errors:.\n\n", reason);
        await activeBrowser.close();
    });