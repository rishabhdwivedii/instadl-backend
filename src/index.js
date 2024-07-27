const express = require("express");
const axios = require("axios");
const { parse } = require("node-html-parser");
const cors = require("cors");

const app = express();
const port = 3001;

app.use(cors());

const instagramPostLink = "https://www.instagram.com/p/C89W94RJVsM/";

async function getPostLink(url) {
  try {
    url = url + "embed/captioned";
    const response = await axios.get(url);
    const root = parse(response.data);

    if (response.data.includes("video_url")) {
      return getVideoLinkFromHtml(response.data);
    } else {
      const imgElement = root.querySelector("img.EmbeddedMediaImage");
      if (imgElement) {
        return imgElement.getAttribute("src").replace(/&amp;/g, "&");
      } else {
        console.error("Image element not found");
        return "";
      }
    }
  } catch (error) {
    console.error("Error fetching post link:", error);
    return "";
  }
}

function getVideoLinkFromHtml(html) {
  const videoData = html.match(/"video_url":"(.*?)"/);
  return videoData ? videoData[1].replace(/\\u0026/g, "&") : "";
}

app.get("/instagram-post", async (req, res) => {
  const result = await getPostLink(instagramPostLink);
  if (result) {
    res.json({ link: result });
  } else {
    res.status(500).json({ error: "Failed to fetch Instagram post link" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
