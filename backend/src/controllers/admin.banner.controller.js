// Admin banner controller — CRUD for promotional banners that
// surface on the home screen carousel. Broadcasts BANNER_UPDATE on
// every mutation so connected clients can refresh the carousel.

const Banner = require("../models/banner.model");
const { broadcast } = require("../utils/sse");

const getBanners = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const query = {};
    const total = await Banner.countDocuments(query);
    const totalPages = Math.ceil(total / limitNum);
    const banners = await Banner.find(query)
      .sort({ display_order: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    res.json({
      success: true,
      data: banners,
      pagination: { page: pageNum, limit: limitNum, total, totalPages },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      image_url,
      image_base64,
      image_mime,
      link_url,
      is_active,
      display_order,
    } = req.body;
    if (!title || !description || (!image_url && !image_base64)) {
      return res.status(400).json({ success: false, message: "title, description, and image (url or base64) are required" });
    }
    const source = image_base64 ? "base64" : "url";
    const banner = await Banner.create({
      title,
      description,
      image_url,
      image_base64,
      image_mime: image_mime || (image_base64 ? "image/jpeg" : undefined),
      image_source: source,
      link_url,
      is_active: is_active !== undefined ? is_active : true,
      display_order: display_order || 0,
      created_by: req.user._id,
    });
    broadcast({ type: 'BANNER_UPDATE', action: 'create', data: banner });
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.image_base64) {
      updates.image_source = "base64";
      updates.image_mime = updates.image_mime || "image/jpeg";
    }
    if (updates.image_url) {
      updates.image_source = "url";
    }
    const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });
    if (!banner) {
      return res.status(404).json({ success: false, message: "Banner not found" });
    }
    broadcast({ type: 'BANNER_UPDATE', action: 'update', data: banner });
    res.json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    broadcast({ type: 'BANNER_UPDATE', action: 'delete', data: { _id: id } });
    res.json({ success: true, message: "Banner deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
