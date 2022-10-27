"use strict";
const express = require("express");
const router = express.Router();
const moment = require("moment");

router.all("/", (req, res) =>
  res
    .status(200)
    .json({ status: false, msg: "welcom to zembed" })
);

//router.get('/:token/:quality.mp4' , require('./controllers/stream.mp4'));
router.get('/:token/:quality/:seg.(jpg|png|html)' , require('./controllers/stream.hls'));

router.all("*", function (req, res) {
  res.status(404).json({ status: false, msg: "page not found" })
});
module.exports = router;
