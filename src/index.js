const express = require("express");
const axios = require("axios");
const { parse } = require("node-html-parser");
const puppeteer = require("puppeteer");

const cors = require("cors");

const app = express();
const port = 3001;

app.use(cors());

const instagramPostLink = "https://www.instagram.com/p/C89W94RJVsM/";

const apiUrl =
  "https://i.instagram.com/api/v1/users/web_profile_info/?username=rishabhdwivedii";
const userAgent =
  "Instagram 337.0.0.0.77 Android (28/9; 420dpi; 1080x1920; samsung; SM-G611F; on7xreflte; samsungexynos7870; en_US; 493419337)";

// profile picture
app.get("/profile-pic", async (req, res) => {
  try {
    const response = await axios.get(apiUrl, {
      headers: {
        "User-Agent": userAgent,
      },
    });

    const profilePicUrlHD = response.data.data.user.profile_pic_url_hd;

    res.json({ profilePicUrl: profilePicUrlHD });
  } catch (error) {
    console.error("User not found or error occurred:", error.message);
    res.status(500).json({ error: "User not found or error occurred" });
  }
});

async function getPostLink(url) {
  try {
    url = url + "embed/captioned";
    const response = await axios.get(url);
    const root = parse(response.data);

    if (response.data.includes("video_url")) {
      return { type: "video", url: getVideoLinkFromHtml(response.data) };
    } else {
      const imgElement = root.querySelector("img.EmbeddedMediaImage");
      if (imgElement) {
        return {
          type: "image",
          url: imgElement.getAttribute("src").replace(/&amp;/g, "&"),
        };
      } else {
        console.error("Image element not found");
        return { type: "unknown", url: "" };
      }
    }
  } catch (error) {
    console.error("Error fetching post link:", error);
    return { type: "error", url: "" };
  }
}

function getVideoLinkFromHtml(html) {
  const videoData = html.match(/"video_url":"(.*?)"/);
  return videoData ? videoData[1].replace(/\\u0026/g, "&") : "";
}

app.get("/instagram-post", async (req, res) => {
  const result = await getPostLink(instagramPostLink);
  if (result.url) {
    res.json(result);
  } else {
    res.status(500).json({ error: "Failed to fetch Instagram post link" });
  }
});

app.get("/media-proxy", async (req, res) => {
  const mediaUrl = req.query.url;

  if (!mediaUrl) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const response = await axios.get(mediaUrl, { responseType: "stream" });
    res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (error) {
    console.error("Error proxying media:", error);
    res.status(500).json({ error: "Failed to fetch media" });
  }
});

//for reels
process.on("unhandledRejection", (reason, promise) => {
  if (reason.message !== "Navigating frame was detached") {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  }
});

const getInstagramReel = async (instagramReelURL) => {
  let browser;
  let downloadLinks = [];
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.48",
    ];

    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log("UserAgent : " + randomUserAgent);
    await page.setUserAgent(randomUserAgent);

    const WebsiteURL = "https://snapinsta.app";

    await page.goto(WebsiteURL, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForSelector("#url");

    await page.$eval(
      'input[name="url"]',
      (el, value) => (el.value = value),
      instagramReelURL
    );

    await page.waitForSelector('button[type="submit"]');
    await page.$eval('button[type="submit"]', (button) => button.click());

    await page.waitForSelector(".download-bottom");

    const href = await page.$eval(".download-bottom a", (a) => a.href);

    downloadLinks.push(href);

    return downloadLinks;
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

app.get("/reels", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    await page.goto(WebsiteURL, { waitUntil: "networkidle2", timeout: 60000 });
    return res.status(400).send("URL parameter is required");
  }

  try {
    const reelLinks = await getInstagramReel(url);
    res.status(200).json({ links: reelLinks });
  } catch (error) {
    console.error("Error fetching Instagram reel:", error);
    res.status(500).send("An error occurred while fetching the Instagram reel");
  }
});

//for stories
process.on("unhandledRejection", (reason, promise) => {
  if (reason.message !== "Navigating frame was detached") {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  }
});

const getInstagramStories = async (instagramStoriesURL) => {
  let browser;
  let page;
  let downloadLinks = [];
  try {
    browser = await puppeteer.launch({ headless: true });
    page = await browser.newPage();

    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.48",
    ];

    const randomUserAgent =
      userAgents[Math.floor(Math.random() * userAgents.length)];
    console.log("UserAgent : " + randomUserAgent);
    await page.setUserAgent(randomUserAgent);

    const WebsiteURL = "https://fastdl.app/story-saver";

    await page.goto(WebsiteURL, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForSelector("#search-form-input");

    await page.$eval(
      "#search-form-input",
      (el, value) => {
        el.value = value;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      instagramStoriesURL
    );

    await page.click(".search-form__button");

    await page.waitForSelector(".output-list__item", { timeout: 60000 });

    const downloadLinks = await page.$$eval(
      ".button.button--filled.button__download",
      (elements) => elements.map((el) => el.href)
    );

    return downloadLinks;
  } catch (error) {
    if (page) {
      await page.screenshot({ path: "error_screenshot.png" });
    }
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

app.get("/stories", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send("URL parameter is required");
  }

  try {
    const storiesLinks = await getInstagramStories(url);
    res.status(200).json({ links: storiesLinks });
  } catch (error) {
    console.error("Error fetching Instagram stories:", error);
    res
      .status(500)
      .send("An error occurred while fetching the Instagram stories");
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
