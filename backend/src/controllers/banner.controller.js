const Banner = require("../models/banner.model");
const cache = require("../utils/cache");

const BANNER_CACHE_KEY = "banners:active";
const BANNER_CACHE_TTL = 300;

const listActiveBanners = async (req, res) => {
  try {
    let data = await cache.get(BANNER_CACHE_KEY);
    if (!data) {
      const banners = await Banner.find({ is_active: true }).sort({
        display_order: 1,
        createdAt: -1,
      });
      data = banners.map((b) => {
        const banner = b.toObject();
        if (!banner.image_url && banner.image_base64) {
          const mime = banner.image_mime || "image/jpeg";
          banner.image_url = `data:${mime};base64,${banner.image_base64}`;
        }
        return banner;
      });
      await cache.set(BANNER_CACHE_KEY, data, BANNER_CACHE_TTL);
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { listActiveBanners };
