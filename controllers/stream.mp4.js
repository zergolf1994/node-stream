"use strict";
const request = require("request");
const path = require("path");
const fs = require("fs");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Storage = require("../modules/Mysql/Storage");
const { Sequelize, Op } = require("sequelize");
const http = require("http");
const e = require("express");

module.exports = async (req, res) => {
  const { token, quality } = req.params;
  const ext = req.params[0];
  const quality_allow = ["1080", "720", "480", "360", "default"];

  try {
    if (!token || !quality) return res.status(404).json({ status: false });

    if (!quality_allow.includes(quality))
      return res.status(404).json({ status: false });

    let tmp_data = `public/data/${token}.json`,
      sv_ip,
      sv_id,
      saveCache = true,
      where = {};

    if (!fs.existsSync(tmp_data)) {
      where.quality = quality;
      where.token = token;
      where.active = 1;

      const FindVideo = await FilesVideo.findOne({ where: where });
      if (!FindVideo) return res.status(404).json({ status: false });

      sv_id = FindVideo?.sv_id;

      const FindStorage = await Storage.findOne({
        attributes: [`sv_ip`],
        where: { id: sv_id },
      });
      if (!FindStorage) return res.status(404).json({ status: false });

      fs.writeFileSync(tmp_data, JSON.stringify(FindStorage), "utf8");
      sv_ip = FindStorage?.sv_ip;
    } else {
      let file_read = fs.readFileSync(tmp_data, "utf8");
      const data = JSON.parse(file_read);
      sv_ip = data?.sv_ip;
    }

    if (!sv_ip) return res.status(404).json({ status: false });

    const host = `http://${sv_ip}:8889/mp4/${token}/file_${quality}.mp4`;

    
    http.get(host, function (resp) {
      let buffers = [];
      let length = 0;
      resp.on("data", function (chunk) {
        // store each block of data
        length += chunk.length;
        buffers.push(chunk);
      });
      resp.on("end", function () {
        let content = Buffer.concat(buffers);
      });
      resp.pipe(res);
    });
  } catch (error) {
    console.log(error)
    return res.json({ status: false, msg: error.name });
  }
};
