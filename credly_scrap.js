
const cheerio = require('cheerio');

async function scrapCredlyDetails() {
    const response = await fetch("https://www.credly.com/users/faraz-ahmad.a5935bd3/badges#credly");
    const html = await response.text();
    
    const parsedHTML = cheerio.load(html);

    console.log(html);
    

    parsedHTML("span.Typographystyles__Container-fredly__sc-1jldzrm-0 enJnLg badge-wallet__stackable-earned-badge-card__badge-name")
        .each((i,e) => {
            console.log(parsedHTML(e).text());    
        });
}

scrapCredlyDetails();