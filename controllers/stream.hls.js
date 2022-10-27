"use strict";

const path = require("path");
const fs = require("fs");
const FilesVideo = require("../modules/Mysql/FilesVideo");
const Storage = require("../modules/Mysql/Storage");
const { Sequelize, Op } = require("sequelize");
const http = require("http");
const e = require("express");

module.exports = async (req, res) => {
  const { token, quality, seg } = req.params;
  const ext = req.params[0];
  const quality_allow = ["1080", "720", "480", "360", "default"];

  try {
    if (!token || !quality || !seg)
      return res.status(404).json({ status: false });

    if (!quality_allow.includes(quality))
      return res.status(404).json({ status: false });

    let tmp_data = `public/data/${token}.json`,
      cache_seg = `public/storage/${token}/${quality}/${seg}.txt`,
      sv_ip,
      sv_id,
      saveCache=false,
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
      if (!fs.existsSync(`public`)) {
        fs.mkdirSync(`public`);
      }
      if (!fs.existsSync(`public/data`)) {
        fs.mkdirSync(`public/data`);
      }

      fs.writeFileSync(tmp_data, JSON.stringify(FindStorage), "utf8");
      sv_ip = FindStorage?.sv_ip;
    } else {
      let file_read = fs.readFileSync(tmp_data, "utf8");
      const data = JSON.parse(file_read);
      sv_ip = data?.sv_ip;
    }

    if (!sv_ip) return res.status(404).json({ status: false });

    const host = `http://${sv_ip}:8889/hls/${token}/file_${quality}.mp4/seg-${seg}-v1-a1.ts`;
    //return res.json({ status: false, host });
    if (fs.existsSync(cache_seg) && saveCache) {
      let data_cache = await fs.readFileSync(cache_seg);
      streamCache(data_cache)
    } else {
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
          streamContent(content);
        });
        //resp.pipe(res);
      });
    }

    function streamCache (content) {

      res.set("Cache-control", "public, max-age=31536000");
      res.set("Last-modified", "Sun, 31 Jul 2022 00:00:01 GMT");

      if (ext == "html") {
        res.set("Content-type", "text/html");
      } else {
        res.set("Content-type", `image/${ext}`);
      }

      return res.status(200).end(content);
    };
    const streamContent = function (content) {

      if (!fs.existsSync(cache_seg) && saveCache) {
        if (!fs.existsSync(`public`)) {
          fs.mkdirSync(`public`);
        }
        if (!fs.existsSync(`public/storage`)) {
          fs.mkdirSync(`public/storage`);
        }
        if (!fs.existsSync(`public/storage/${token}/`)) {
          fs.mkdirSync(`public/storage/${token}/`);
        }

        if (!fs.existsSync(`public/storage/${token}/${quality}`)) {
          fs.mkdirSync(`public/storage/${token}/${quality}`);
        }
        if (!fs.existsSync(cache_seg)) {
          fs.writeFileSync(cache_seg, content, "utf8");
        }
        
      }

      res.set("Cache-control", "public, max-age=31536000");
      res.set("Last-modified", "Sun, 31 Jul 2022 00:00:01 GMT");

      if (ext == "html") {
        res.set("Content-type", "text/html");
      } else {
        res.set("Content-type", `image/${ext}`);
      }

      return res.status(200).end(content);
    };
  } catch (error) {
    return res.json({ status: false, msg: error.name });
  }
};
