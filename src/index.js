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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
