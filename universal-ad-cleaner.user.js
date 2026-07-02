// ==UserScript==
// @name         通用去广告助手
// @namespace    https://github.com/guliacer/universal-ad-cleaner
// @version      1.2.10
// @description  保守清理常见网页广告、百度搜索右栏与推广跳转、百度地图下载/领券浮层、贴吧弹窗/搜索推荐、3DM论坛广告、站酷推荐素材、D3X7居中提示、夸克网盘推广提示、OpenArt营销弹窗、小红书自动登录弹窗/回复展开、LibLibAI登录领积分/离站弹窗、淘宝首页精简/搜索页广告侧栏、B站推广卡片、视频站广告层、正文遮挡、悬浮广告、广告 iframe 和动态插入广告，支持全局/站点开关。
// @author       guliacer
// @match        http://*/*
// @match        https://*/*
// @exclude      *://*.bilibili.com/appeal*
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @homepageURL  https://github.com/guliacer/universal-ad-cleaner
// @supportURL   https://github.com/guliacer/universal-ad-cleaner/issues
// @downloadURL  https://raw.githubusercontent.com/guliacer/universal-ad-cleaner/main/universal-ad-cleaner.user.js
// @updateURL    https://raw.githubusercontent.com/guliacer/universal-ad-cleaner/main/universal-ad-cleaner.user.js
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  const GLOBAL_ENABLED_KEY = 'adCleaner.globalEnabled';
  const DISABLED_HOSTS_KEY = 'adCleaner.disabledHosts';
  const MARK = 'data-tm-ad-cleaner';
  const hostname = location.hostname.replace(/^www\./, '');
  const isBaiduHost = /(^|\.)baidu\.com$/.test(hostname);
  const isBaiduMapHost = /^map\.baidu\.com$/.test(hostname);
  const isTiebaHost = /(^|\.)tieba\.baidu\.com$/.test(hostname);
  const isBilibiliHost = /(^|\.)bilibili\.com$/.test(hostname);
  const isThreeDmForumHost = /^bbs\.3dmgame\.com$/.test(hostname);
  const isZcoolHost = /(^|\.)zcool\.com\.cn$/.test(hostname);
  const isD3x7Host = /(^|\.)d3x7\.com$/.test(hostname);
  const isQuarkPanHost = /^pan\.quark\.cn$/.test(hostname);
  const isOpenArtHost = /(^|\.)openart\.ai$/.test(hostname);
  const isXiaohongshuHost = /(^|\.)xiaohongshu\.com$/.test(hostname);
  const isLiblibHost = /(^|\.)liblib\.art$/.test(hostname);
  let xiaohongshuManualLoginUntil = 0;
  let xiaohongshuReplyExpandUntil = 0;
  let xiaohongshuLoginGateInstalled = false;

  const storage = {
    get(key, defaultValue) {
      try {
        if (typeof GM_getValue === 'function') return GM_getValue(key, defaultValue);
      } catch (_) {
        // Tampermonkey API may be unavailable in a few sandboxed frames.
      }

      try {
        const raw = localStorage.getItem(key);
        return raw == null ? defaultValue : JSON.parse(raw);
      } catch (_) {
        return defaultValue;
      }
    },
    set(key, value) {
      try {
        if (typeof GM_setValue === 'function') {
          GM_setValue(key, value);
          return;
        }
      } catch (_) {
        // Fall through to localStorage.
      }

      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (_) {
        // Ignore storage failures; the cleaner can still run for this page.
      }
    },
  };

  const globallyEnabled = storage.get(GLOBAL_ENABLED_KEY, true);
  const disabledHosts = storage.get(DISABLED_HOSTS_KEY, []);
  const disabledHere = disabledHosts.includes(hostname);

  registerMenus();

  if (!globallyEnabled || disabledHere) {
    return;
  }

  setupXiaohongshuLoginGate();

  const baseHideSelectors = [
    '.ad',
    '.ads',
    '.adsbox',
    '.ad-box',
    '.ad-card',
    '.ad-wrap',
    '.ad-wrapper',
    '.ad-container',
    '.ad-banner',
    '.adblock',
    '.adholder',
    '.ad-placeholder',
    '.advert',
    '.advertise',
    '.advertisement',
    '.advertising',
    '.sponsor',
    '.sponsored',
    '.sponsored-links',
    '.promoted',
    '.promo-ad',
    '.google-auto-placed',
    '.adsbygoogle',
    'ins.adsbygoogle',
    '[data-ad-client]',
    '[data-ad-slot]',
    '[data-ad-format]',
    '[data-ad-region]',
    '[data-google-query-id]',
    '[id^="ad-"]',
    '[id$="-ad"]',
    '[id*="-ad-"]',
    '[id^="ads-"]',
    '[id$="-ads"]',
    '[id*="-ads-"]',
    '[class^="ad-"]',
    '[class$="-ad"]',
    '[class*="-ad-"]',
    '[class^="ads-"]',
    '[class$="-ads"]',
    '[class*="-ads-"]',
    '[class*="_ad_"]',
    '[class*="_ads_"]',
    '[aria-label*="广告"]',
    '[title*="广告"]',
    '[id*="advert"]',
    '[class*="advert"]',
    '[id*="sponsor"]',
    '[class*="sponsor"]',
    '[id*="promotion"]',
    '[class*="promotion"]',
    '[data-testid*="ad"]',
    '[data-testid*="sponsor"]',
    'iframe[title*="广告"]',
    'iframe[title*="Advertisement"]',
    '.ad-layer',
    '.ad-mask',
    '.ad-overlay',
    '.ad-player',
    '.ad-video',
    '.ad-countdown',
    '.ad-skip',
    '.ad-tips',
    '.ad-interrupt',
    '.ad-pause',
    '.pause-ad',
    '.player-ad',
    '.video-ad',
    '.advertise-layer',
    '.advertising-layer',
    '.sponsor-banner',
  ];

  const baseRemoveSelectors = [
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="googleadservices.com"]',
    'iframe[src*="adservice.google."]',
    'iframe[src*="pos.baidu.com"]',
    'iframe[src*="cpro.baidu.com"]',
    'iframe[src*="eiv.baidu.com"]',
    'iframe[src*="eclick.baidu.com"]',
    'iframe[src*="mobads.baidu.com"]',
    'iframe[src*="wangmeng.baidu.com"]',
    'iframe[src*="union.baidu.com"]',
    'iframe[src*="cbjs.baidu.com"]',
    'iframe[src*="cpro.baidustatic.com"]',
    'iframe[src*="dup.baidustatic.com"]',
    'iframe[src*="alimama.com"]',
    'iframe[src*="tanx.com"]',
    'iframe[src*="adnxs.com"]',
    'iframe[src*="ads-twitter.com"]',
    'iframe[src*="adsafeprotected.com"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="admaster.com.cn"]',
    'iframe[src*="adsame.com"]',
    'iframe[src*="miaozhen.com"]',
    'iframe[src*="taboola.com"]',
    'iframe[src*="outbrain.com"]',
    'iframe[src*="criteo.com"]',
    'iframe[src*="gdt.qq.com"]',
    'iframe[src*="l.qq.com"]',
    'iframe[src*="atm.youku.com"]',
    'iframe[src*="cupid.iqiyi.com"]',
    'script[src*="doubleclick.net"]',
    'script[src*="googlesyndication.com"]',
    'script[src*="googleadservices.com"]',
    'script[src*="adservice.google."]',
    'script[src*="pos.baidu.com"]',
    'script[src*="cpro.baidu.com"]',
    'script[src*="eiv.baidu.com"]',
    'script[src*="eclick.baidu.com"]',
    'script[src*="mobads.baidu.com"]',
    'script[src*="wangmeng.baidu.com"]',
    'script[src*="union.baidu.com"]',
    'script[src*="cbjs.baidu.com"]',
    'script[src*="cpro.baidustatic.com"]',
    'script[src*="dup.baidustatic.com"]',
    'script[src*="alimama.com"]',
    'script[src*="tanx.com"]',
    'script[src*="admaster.com.cn"]',
    'script[src*="adsame.com"]',
    'script[src*="miaozhen.com"]',
    'script[src*="gdt.qq.com"]',
    'script[src*="l.qq.com"]',
    'script[src*="atm.youku.com"]',
    'script[src*="ad.api.3g.youku.com"]',
    'script[src*="ad.m.iqiyi.com"]',
    'script[src*="cupid.iqiyi.com"]',
    'script[src*="taboola.com"]',
    'script[src*="outbrain.com"]',
  ];

  const siteRules = [
    {
      host: /(^|\.)baidu\.com$/,
      hide: [
        '.ec-tuiguang',
        '.ec_wise_ad',
        '.ec_youxuan_card',
        '.ec-ad',
        '.ec_ad',
        '.ec_ad_results',
        '.ec-result',
        '.page-banner',
        '.fc-ad',
        '.fengchao-ad',
        '.fengchao-wrap',
        '.se-ad',
        '.sponsored-result',
        '.commercial-result',
        '.result-op[tpl="right_toplist"]',
        '.result[tpl*="ad"]',
        '.result-op[tpl*="ad"]',
        '.result[tpl*="tuiguang"]',
        '.result-op[tpl*="tuiguang"]',
        '.c-container[tpl*="ad"]',
        '.c-container[tpl*="tuiguang"]',
        '.c-container[cmatchid]',
        '.result[cmatchid]',
        '.result-op[cmatchid]',
        '[data-baodata]',
        '[data-tuiguang]',
        '[data-click*="ads"]',
        '[data-click*="advert"]',
        '[data-click*="tuiguang"]',
        '[data-click*="fengchao"]',
        '[data-log*="ads"]',
        '[data-log*="advert"]',
        '[data-log*="tuiguang"]',
        '[data-log*="fengchao"]',
        '[data-module*="ads"]',
        '[data-module*="advert"]',
        '[data-module*="tuiguang"]',
        '[data-module*="fengchao"]',
        '[tpl*="tuiguang"]',
        '[class*="tuiguang"]',
        '[id*="tuiguang"]',
        '[class*="fengchao"]',
        '[id*="fengchao"]',
        '[class*="baidu-ad"]',
        '[id*="baidu-ad"]',
        '.bd-ad',
        '.bd-ads',
        '.bd-ad-box',
        '.bd-ad-container',
        '.wgt-ads',
        '.wgt-ad',
        '.wgt-ads-right',
        '.wgt-ads-left',
        '.wgt-ads-bottom',
        '.qb-section-ad',
        '.union-ad',
        '.spread-ad',
        '.right-ad',
        '.bottom-ad',
        '.side-ad',
        '.feed-ad',
        '.tieba-ad',
        '.aside-ad',
        '.poster-ads',
        '.lemma-ad',
        '.lemmaWgt-promotion',
        '.promotion-declaration',
        '.wk-ad',
        '.wenku-ad',
        '.reader-tools-ad',
        '.app-guide',
        '.app-download',
        '.download-app',
        '.open-app',
        '.baiduappcall-wrap',
        '.app-promote',
        '.mobile-promotion',
        '.float-ads',
        '.fixed-ads',
        '[tpl="recommend_list"]',
        '#rs_new',
        '#content_right [cmatchid]',
        '#content_right [data-tuiguang]',
        '#content_right > table > tbody > tr > td > div:not(#con-ar)',
      ],
      css: `
        #content_left > [cmatchid],
        #content_left > [data-tuiguang],
        #content_left > [data-baodata],
        #content_left > [tpl*="tuiguang"],
        #content_left > div[style*="display:block"][style*="important"],
        #content_left > div[style*="display: block"][style*="important"],
        #content_left > table[style*="display:table"][style*="important"],
        #content_left > table[style*="display: table"][style*="important"],
        #content_right > [cmatchid],
        #content_right > [data-tuiguang],
        #content_right > [tpl*="tuiguang"],
        #content_right > table > tbody > tr > td > div:not(#con-ar),
        [tpl="recommend_list"],
        #rs_new,
        .ec_youxuan_card,
        .page-banner {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /^baidu\.com$/,
      path: /^\/(?:s|baidu)(?:[?#/]|$)/,
      hide: [
        '#content_right',
        '#con-ar',
        '#rs_new',
        '[tpl="recommend_list"]',
        '[tpl="right_toplist"]',
        '.cr-content',
        '.opr-recommends-merge',
      ],
      remove: [
        '#content_right',
        '#con-ar',
        '#rs_new',
        '[tpl="recommend_list"]',
        '[tpl="right_toplist"]',
        '.cr-content',
        '.opr-recommends-merge',
      ],
      css: `
        #content_right,
        #con-ar,
        #rs_new,
        [tpl="recommend_list"],
        [tpl="right_toplist"],
        .cr-content,
        .opr-recommends-merge {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /^map\.baidu\.com$/,
      hide: [
        '#moContainerId',
        '.mo-popup',
        '.moContainer',
        '.moContainerSuccess',
        '.dimensionalCode',
        '.dimensionalCodeTip',
        '.andriodDownload',
        '.iphoneDownload',
        '[class*="MobileDownload"]',
        '[class*="mobileDownload"]',
        '[class*="mobile-download"]',
        '[class*="downloadBanner"]',
        '[class*="DownloadBanner"]',
        '[class*="DynamicBanner"]',
        '[class*="dynamicBanner"]',
      ],
      remove: [
        '#moContainerId',
        '.mo-popup',
        '.moContainer',
        '.moContainerSuccess',
        '[class*="MobileDownload"]',
        '[class*="mobileDownload"]',
        '[class*="mobile-download"]',
        '[class*="downloadBanner"]',
        '[class*="DownloadBanner"]',
        '[class*="DynamicBanner"]',
        '[class*="dynamicBanner"]',
      ],
      css: `
        #moContainerId,
        .mo-popup,
        .moContainer,
        .moContainerSuccess,
        .dimensionalCode,
        .dimensionalCodeTip,
        .andriodDownload,
        .iphoneDownload,
        [class*="MobileDownload"],
        [class*="mobileDownload"],
        [class*="mobile-download"],
        [class*="downloadBanner"],
        [class*="DownloadBanner"],
        [class*="DynamicBanner"],
        [class*="dynamicBanner"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /^tieba\.baidu\.com$/,
      path: /^\/f(?:[?#]|$)/,
      hide: [
        '.pb_adbanner',
        '.frs_aside_ad',
        '.thread_list_ad',
        '.tieba-ad',
        '.tb-ad',
        '.game-ad',
        '[class*="tieba-ad"]',
        '[class*="thread-ad"]',
        '[data-tuiguang]',
      ],
    },
    {
      host: /^tieba\.baidu\.com$/,
      path: /^\/f\/search(?:[/?#]|$)/,
      hide: [
        '[class*="recommend"]',
        '[class*="Recommend"]',
        '[class*="hot-list"]',
        '[class*="HotList"]',
        '[class*="right-side"]',
        '[class*="rightSide"]',
        '[class*="side-bar"]',
        '[class*="sideBar"]',
      ],
    },
    {
      host: /^bbs\.3dmgame\.com$/,
      path: /^(?:\/thread-\d+|\/forum\.php\?mod=viewthread|\/forum-\d+)/,
      hide: [
        '.wp.a_h',
        '.a_pt',
        '.a_cn',
        'table.ad',
        'tr.ad',
        '#min_ad_con',
        '#ad_corner_close',
        '[id^="_matter_"]',
        'iframe[src*="yeyou.3dmgame.com/tools/gamead"]',
      ],
      remove: [
        '.wp.a_h',
        '.a_pt',
        '.a_cn',
        'table.ad',
        'tr.ad',
        '#min_ad_con',
        '#ad_corner_close',
        '[id^="_matter_"]',
        'script[src*="fc.3dmgame.com/js/img.js"]',
        'script[src*="fc.3dmgame.com/gimg/"]',
        'iframe[src*="yeyou.3dmgame.com/tools/gamead"]',
        'a[href*="fc.3dmgame.com/cimg/"]',
      ],
      css: `
        .wp.a_h,
        .a_pt,
        .a_cn,
        table.ad,
        tr.ad,
        #min_ad_con,
        #ad_corner_close,
        [id^="_matter_"],
        iframe[src*="yeyou.3dmgame.com/tools/gamead"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /(^|\.)bilibili\.com$/,
      hide: [
        '.ad-report',
        '.ad-floor-card',
        '.ad-floor-cover',
        '.ad-floor-exp',
        '.banner-card',
        '.gg-floor-module',
        '.video-page-game-card-small',
        '.video-page-operator-card-small',
        '.video-page-special-card-small',
        '.video-page-card-small-ad',
        '.slide-ad-exp',
        '.pop-live-small-mode',
        '.bili-video-card__info--ad',
        '.bili-video-card__info--creative-ad',
        '.bili-video-card__stats--ad',
        '.bili-live-card__info--ad',
        '.right-bottom-banner',
        '.eva-extension-area',
        '.desktop-download-tip',
        '.download-client-trigger',
        '.activity-m-v1',
        '.activity-m-v2',
        '.video-card-ad-small',
        '[class*="ad-floor"]',
        '[class*="creative-ad"]',
        '[data-ad]',
        '[data-is-ad]',
        '[data-ad-report]',
      ],
      css: `
        .bili-video-card[data-ad],
        .bili-video-card[data-is-ad],
        .bili-live-card[data-ad],
        .video-page-card-small[data-ad],
        .video-page-card-small[data-is-ad] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /(^|\.)csdn\.net$/,
      hide: [
        '.blog_container_aside',
        '.csdn-side-toolbar',
        '.recommend-ad-box',
        '.mediav_ad',
        '.programmer1Box',
        '.toolbar-advert',
        '.hide-article-box',
        '.divcodes',
        '.divmark',
        'body > div[id*="kp_box_"]',
        '[id^="kp_box_"]',
        '[id*="kp_box_"]',
        '.csdn-toolbar-creative-mp',
        '.csdn-tracking-statistics',
        '.recommend-box .recommend-ad-box',
        '.recommend-right .recommend-ad-box',
        '.recommend-item-box[data-type="ad"]',
      ],
      css: `
        .article_content,
        #article_content,
        .divtexts {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
      `,
    },
    {
      host: /^(s\.taobao|list\.tmall)\.com$/,
      path: /^\/(?:search|search_product)(?:[/.?#]|$)/,
      hide: [
        'div.grid-right',
        '#J_Recommend',
        '[id^="mainsrp-p4p"]',
      ],
      css: `
        div.grid-left {
          width: 100% !important;
        }

        .list-item {
          margin-left: auto !important;
          margin-right: auto !important;
        }
      `,
    },
    {
      host: /^shopsearch\.taobao\.com$/,
      path: /^\/search(?:[/.?#]|$)/,
      hide: [
        '.grid-right',
      ],
      css: `
        .grid-left {
          float: none !important;
        }

        .grid-total,
        #J_SiteNavBd,
        #srp-footer > .footer {
          width: 990px !important;
        }
      `,
    },
    {
      host: /^taobao\.com$/,
      path: /^\/(?:[?#]|$)/,
      hide: [
        '.main',
        '.nav',
        '.J_TbSearchContent',
        '.search-ft',
        '.tbh-qr',
        '.tbh-app',
        '.tbh-belt',
        '.tbh-notice',
        '.J_Core',
        '.seat',
        '.bottom',
        '.hander',
        '.service-ft',
        '.footer',
        '.member-tjb',
      ],
    },
    {
      host: /(^|\.)douban\.com$/,
      hide: [
        '.aside .ad',
        '.dale_ad',
        '[id^="dale_"]',
      ],
    },
    {
      host: /(^|\.)ithome\.com$/,
      hide: [
        '.adblock',
        '.lapin',
        '.gg',
      ],
    },
    {
      host: /(^|\.)jianshu\.com$/,
      hide: [
        '.note-fixed-ad-container',
        '.youdao-flow-ad',
      ],
    },
    {
      host: /(^|\.)qq\.com$/,
      hide: [
        '.l_qq_com',
        '.qqcom_ad',
        '[class*="admod"]',
        '.txp_ad',
        '.txp_ad_container',
        '.txp_ad_player',
        '.txp_ad_tip',
        '.txp_ad_button',
        '.txp_ad_skip',
        '.txp_popup',
        '.mod_player_popup',
        '.mod_vip_popup',
        '.player-overlay-ad',
        '.tvip_layer',
        '[class*="txp_ad"]',
      ],
    },
    {
      host: /(^|\.)sohu\.com$/,
      hide: [
        '.god-wrapper',
        '.adver',
        '.x-ad',
        '.x-player-adv',
        '.player-ad',
        '.svp-ad',
      ],
    },
    {
      host: /(^|\.)youku\.com$/,
      hide: [
        '.advertise-layer',
        '.ad-interact-layer',
        '.ad-control-layer',
        '.ad-player',
        '.ad-video',
        '.h5-ad-layer',
        '.kui-ad',
        '.kui-ad-player',
        '.yk-ad',
        '.youku-ad',
        '.youku-layer-ad',
        '.pause-ad',
        '[class*="advertise-layer"]',
        '[class*="youku-ad"]',
        '[id*="ab_"]',
      ],
    },
    {
      host: /(^|\.)iqiyi\.com$/,
      hide: [
        '.cupid-public',
        '.iqp-ad',
        '.iqp-adBox',
        '.iqp-adVideo',
        '.iqp-adLayer',
        '.iqp-adSkip',
        '.iqp-player-ad',
        '.iqp-player-adWrap',
        '.qy-player-ad',
        '.qy-player-focus-ad',
        '.qy-player-vip-layer',
        '.qy-player-popup',
        '[class*="cupid"]',
        '[class*="iqp-ad"]',
      ],
    },
    {
      host: /(^|\.)iq\.com$/,
      hide: [
        '.intl-ad',
        '.intl-player-ad',
        '.iqp-ad',
        '.iqp-adLayer',
        '[class*="cupid"]',
        '[class*="iqp-ad"]',
      ],
    },
    {
      host: /(^|\.)mgtv\.com$/,
      hide: [
        '.mgtv-ad',
        '.mgtv-player-ad',
        '.m-ad',
        '.gg',
        '.gg-mod',
        '.player-ad',
        '.ad-skip',
        '[class*="mgtv-ad"]',
      ],
    },
    {
      host: /(^|\.)tudou\.com$/,
      hide: [
        '.td-ad',
        '.td-play-ad',
        '.yk-ad',
        '.youku-ad',
        '.advertise-layer',
      ],
    },
    {
      host: /(^|\.)pptv\.com$/,
      hide: [
        '.pptv-ad',
        '.pp_ad',
        '.player-ad',
        '.w-ad',
        '.adbox',
      ],
    },
    {
      host: /(^|\.)le\.com$/,
      hide: [
        '.letv-ad',
        '.le-ad',
        '.player-ad',
        '.ad-layer',
      ],
    },
    {
      host: /(^|\.)1905\.com$/,
      hide: [
        '.player-ad',
        '.vod-ad',
        '.adbox',
        '.ad-layer',
      ],
    },
    {
      host: /(^|\.)acfun\.cn$/,
      hide: [
        '.acfun-ad',
        '.player-ad',
        '.ad-layer',
        '.ad-report',
      ],
    },
    {
      host: /(^|\.)wasu\.cn$/,
      hide: [
        '.wasu-ad',
        '.player-ad',
        '.ad-layer',
        '.adbox',
      ],
    },
    {
      host: /(^|\.)zcool\.com\.cn$/,
      path: /^\/work\//,
      hide: [
        '.likeRecommendList',
        '.recommend-covers',
        '.hellorfContent',
        'a[href*="/assets/"][href*="project=info_bottom"]',
      ],
      remove: [
        '.likeRecommendList',
        '.recommend-covers',
        '.hellorfContent',
      ],
      css: `
        .likeRecommendList,
        .recommend-covers,
        .hellorfContent {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /(^|\.)d3x7\.com$/,
      hide: [
        '.layui-layer',
        '.layui-layer-shade',
        '.layui-layer-setwin',
        '.layui-layer-close',
        '.swal2-container',
        '.modal-backdrop',
        '.v-modal',
        '.el-overlay',
        '.el-dialog__wrapper',
        '.popup-mask',
        '[class*="layui-layer"]',
        '[class*="modal-backdrop"]',
        '[class*="popup-mask"]',
      ],
      remove: [
        '.layui-layer',
        '.layui-layer-shade',
        '.layui-layer-setwin',
        '.layui-layer-close',
        '.swal2-container',
        '.modal-backdrop',
        '.v-modal',
        '.el-overlay',
        '.el-dialog__wrapper',
      ],
      css: `
        .layui-layer,
        .layui-layer-shade,
        .layui-layer-setwin,
        .layui-layer-close,
        .swal2-container,
        .modal-backdrop,
        .v-modal,
        .el-overlay,
        .el-dialog__wrapper,
        .popup-mask,
        [class*="layui-layer"],
        [class*="modal-backdrop"],
        [class*="popup-mask"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /^pan\.quark\.cn$/,
      hide: [
        'a[href*="yuque.com/lihui-yveuk/mfql7o/areokxqzcf4leikt"]',
        'img[src*="broccoli-static.quark.cn/file/others/2026/3/"]',
        'img[src*="yes-file.quark.cn/file/1772184308304"]',
        'img[src*="yes-file.uc.cn/file/1725004739217"]',
        'img[src*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
        '[style*="broccoli-static.quark.cn/file/others/2026/3/"]',
        '[style*="yes-file.quark.cn/file/1772184308304"]',
        '[style*="yes-file.uc.cn/file/1725004739217"]',
        '[style*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
      ],
      css: `
        a[href*="yuque.com/lihui-yveuk/mfql7o/areokxqzcf4leikt"],
        img[src*="broccoli-static.quark.cn/file/others/2026/3/"],
        img[src*="yes-file.quark.cn/file/1772184308304"],
        img[src*="yes-file.uc.cn/file/1725004739217"],
        img[src*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"],
        [style*="broccoli-static.quark.cn/file/others/2026/3/"],
        [style*="yes-file.quark.cn/file/1772184308304"],
        [style*="yes-file.uc.cn/file/1725004739217"],
        [style*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
        }
      `,
    },
    {
      host: /(^|\.)weibo\.com$/,
      hide: [
        '[class*="woo-box-flex"][href*="suda"]',
        '[data-ad]',
      ],
    },
    {
      host: /(^|\.)zhihu\.com$/,
      hide: [
        '.Pc-card',
        '.Pc-Business-Card-PcTopFeedBanner',
        '.TopstoryItem--advertCard',
        '.TopstoryItem[data-za-extra-module*="ad"]',
        '.Question-sideColumnAdContainer',
      ],
    },
  ];

  const adUrlPattern = new RegExp(
    [
      'doubleclick\\.net',
      'googlesyndication\\.com',
      'googleadservices\\.com',
      'adservice\\.google\\.',
      'amazon-adsystem\\.com',
      'adsafeprotected\\.com',
      'adnxs\\.com',
      'admaster\\.com\\.cn',
      'adsame\\.com',
      'miaozhen\\.com',
      'taboola\\.com',
      'outbrain\\.com',
      'criteo\\.com',
      'gdt\\.qq\\.com',
      'l\\.qq\\.com',
      'wa\\.gtimg\\.com',
      'vqq\\.admaster\\.com\\.cn',
      'pos\\.baidu\\.com',
      'cpro\\.baidu\\.com',
      'eiv\\.baidu\\.com',
      'eclick\\.baidu\\.com',
      'mobads\\.baidu\\.com',
      'wangmeng\\.baidu\\.com',
      'union\\.baidu\\.com',
      'cbjs\\.baidu\\.com',
      'cpro\\.baidustatic\\.com',
      'dup\\.baidustatic\\.com',
      'alimama\\.com',
      'tanx\\.com',
      'afp\\.alicdn\\.com',
      'atm\\.youku\\.com',
      'ad\\.api\\.3g\\.youku\\.com',
      'ad\\.m\\.iqiyi\\.com',
      'cupid\\.iqiyi\\.com',
      '/ads?[/?#]',
      '[?&](ad|ads|advert|sponsor)=',
    ].join('|'),
    'i'
  );

  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const activeRules = siteRules.filter((rule) => rule.host.test(hostname) && (!rule.path || rule.path.test(currentPath)));
  const hideSelectors = unique(baseHideSelectors.concat(activeRules.flatMap((rule) => rule.hide || [])));
  const removeSelectors = unique(baseRemoveSelectors.concat(activeRules.flatMap((rule) => rule.remove || [])));
  const extraCss = activeRules.map((rule) => rule.css || '').filter(Boolean).join('\n');
  const hideCss = `${hideSelectors.join(',\n')} {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  ${extraCss}`;

  addStyle(hideCss);

  let cleanupTimer = 0;
  let observer = null;

  whenDomReady(() => {
    cleanup(document);
    startObserver();
  });

  scheduleCleanup();

  function cleanup(root) {
    if (!root || !isElementLikeRoot(root)) return;

    removeBySelectors(root, removeSelectors);
    hideBySelectors(root, hideSelectors);
    removeAdNetworkNodes(root);
    removeTextMarkedAds(root);
    removeSuspiciousFixedAds(root);
    cleanupTiebaFamily(root);
    cleanupThreeDmForum(root);
    cleanupBaiduFamily(root);
    cleanupBaiduMap(root);
    cleanupBilibiliFamily(root);
    cleanupZcoolFamily(root);
    cleanupD3x7Family(root);
    cleanupQuarkPanFamily(root);
    cleanupOpenArtFamily(root);
    cleanupXiaohongshuFamily(root);
    cleanupLiblibFamily(root);
    restoreVideoPlayerControls();
  }

  function removeBySelectors(root, selectors) {
    selectAll(root, selectors).forEach((element) => removeElement(element));
  }

  function hideBySelectors(root, selectors) {
    selectAll(root, selectors).forEach((element) => hideElement(element));
  }

  function removeAdNetworkNodes(root) {
    selectAll(root, ['iframe[src]', 'script[src]', 'embed[src]', 'object[data]', 'a[href]']).forEach((element) => {
      const url = element.getAttribute('src') || element.getAttribute('data') || element.getAttribute('href') || '';
      if (adUrlPattern.test(url)) {
        if (element.tagName === 'A') {
          const box = closestAdBox(element);
          if (box) hideElement(box);
          return;
        }
        removeElement(element);
      }
    });
  }

  function removeTextMarkedAds(root) {
    const candidates = selectAll(root, [
      '[aria-label]',
      '[title]',
      '[data-label]',
      '[data-ad]',
      '[data-advert]',
      '[data-sponsor]',
    ]);

    candidates.forEach((element) => {
      const text = [
        element.getAttribute('aria-label'),
        element.getAttribute('title'),
        element.getAttribute('data-label'),
        element.getAttribute('data-ad'),
        element.getAttribute('data-advert'),
        element.getAttribute('data-sponsor'),
      ].filter(Boolean).join(' ');

      if (/广告|推广|赞助|sponsor|advert/i.test(text)) {
        hideElement(closestAdBox(element) || element);
      }
    });
  }

  function removeSuspiciousFixedAds(root) {
    const elements = selectAll(root, ['body > *', '[style*="position: fixed"]', '[style*="position:fixed"]']);
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);

    elements.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK)) return;

      const style = getComputedStyle(element);
      if (style.position !== 'fixed' && style.position !== 'sticky') return;

      const box = element.getBoundingClientRect();
      const area = box.width * box.height;
      if (area < 6000 || area > viewportArea * 0.55) return;

      const text = compactText(element);
      const likelyAdText = /广告|推广|赞助|关闭广告|Advertisement|Sponsored/i.test(text);
      const bottomOrSideBar = box.bottom > window.innerHeight - 8 || box.right > window.innerWidth - 8 || box.left < 8;
      const hasAdLink = Array.from(element.querySelectorAll('a[href], iframe[src]')).some((node) => {
        const url = node.getAttribute('href') || node.getAttribute('src') || '';
        return adUrlPattern.test(url);
      });

      if ((likelyAdText || hasAdLink) && bottomOrSideBar) {
        hideElement(element);
      }
    });
  }

  function cleanupTiebaFamily(root) {
    if (!isTiebaHost) return;

    cleanupTiebaSearchRecommendations(root);

    const candidates = selectAll(root, [
      '[class*="ad-"]',
      '[class*="-ad"]',
      '[class*="_ad"]',
      '[class*="ad_"]',
      '[class*="advert"]',
      '[class*="tuiguang"]',
      '[class*="popup"]',
      '[class*="modal"]',
      '[class*="dialog"]',
      '[class*="mask"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'body > div',
    ]);

    let removedOverlay = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const overlay = tiebaAdOverlayNode(element);
      if (overlay) {
        removeElement(overlay);
        removedOverlay = true;
      }
    });

    if (removedOverlay) {
      removeTiebaAdBackdrops();
      unlockTiebaPage();
    }
  }

  function cleanupTiebaSearchRecommendations(root) {
    if (!/^\/f\/search(?:[/?#]|$)/.test(currentPath)) return;

    const containers = selectAll(root, [
      'aside',
      'section',
      'div',
      '[class*="right"]',
      '[class*="Right"]',
      '[class*="side"]',
      '[class*="Side"]',
      '[class*="recommend"]',
      '[class*="Recommend"]',
      '[class*="hot"]',
      '[class*="Hot"]',
    ]);

    containers.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;
      if (tiebaSearchRecommendationLooksLike(element)) removeElement(element);
    });

    const headingNodes = selectAll(root, ['h1', 'h2', 'h3', 'h4', 'strong', 'span', 'div']);
    headingNodes.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const text = compactText(element);
      if (text.length > 20 || !/^(最有料热点|最有料吧)$/.test(text)) return;

      const card = closestTiebaSearchRecommendation(element);
      if (card) removeElement(card);
    });
  }

  function tiebaSearchRecommendationLooksLike(element) {
    const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
    if (!/(最有料热点|最有料吧)/.test(text)) return false;
    if (text.length > 2500) return false;
    return isRightSidePanel(element);
  }

  function closestTiebaSearchRecommendation(element) {
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (tiebaSearchRecommendationLooksLike(current)) return current;
      current = current.parentElement;
      depth += 1;
    }

    return null;
  }

  function isRightSidePanel(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 160 || box.height < 50) return false;
    if (box.width > Math.min(560, window.innerWidth * 0.5)) return false;
    if (box.height > window.innerHeight * 1.2) return false;
    return box.left > window.innerWidth * 0.45;
  }

  function tiebaAdOverlayNode(element) {
    if (!tiebaAdOverlayLooksSponsored(element)) return null;
    return closestTiebaOverlay(element) || element;
  }

  function tiebaAdOverlayLooksSponsored(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 80 || box.height < 40) return false;

    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    const style = getComputedStyle(element);
    const zIndex = parseZIndex(style.zIndex);
    const fixedish = style.position === 'fixed' || style.position === 'sticky' || (style.position === 'absolute' && zIndex >= 10);
    const fullScreen = box.width >= window.innerWidth * 0.75 && box.height >= window.innerHeight * 0.75;
    const centered = Math.abs(box.left + box.width / 2 - window.innerWidth / 2) < window.innerWidth * 0.35
      && Math.abs(box.top + box.height / 2 - window.innerHeight / 2) < window.innerHeight * 0.4;

    if (fullScreen && !fixedish && zIndex < 10) return false;
    if (area > viewportArea * 1.2) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedLikeAdPopup = /(^|[-_\s])(ad|ads|advert|tuiguang|promotion|popup|modal|dialog|mask)([-_\s]|$)/i.test(identity);
    const exactAdLabel = hasShortAdLabel(element);
    const closeControl = hasTiebaCloseControl(element);
    const hasAdAsset = Array.from(element.querySelectorAll('a[href], img[src], iframe[src]')).some((node) => {
      const url = node.getAttribute('href') || node.getAttribute('src') || '';
      return /(?:ad|ads|advert|game|tuiguang|promotion|activity|marketing)/i.test(url) || adUrlPattern.test(url);
    });

    return (exactAdLabel && (fixedish || centered || closeControl))
      || (namedLikeAdPopup && closeControl && (fixedish || centered))
      || (exactAdLabel && closeControl && hasAdAsset);
  }

  function closestTiebaOverlay(element) {
    let current = element;
    let depth = 0;
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;

      const box = current.getBoundingClientRect();
      const area = box.width * box.height;
      const style = getComputedStyle(current);
      const zIndex = parseZIndex(style.zIndex);
      const fixedish = style.position === 'fixed' || style.position === 'sticky' || (style.position === 'absolute' && zIndex >= 10);
      const named = /(^|[-_\s])(ad|ads|advert|tuiguang|promotion|popup|modal|dialog|mask)([-_\s]|$)/i.test(`${current.id || ''} ${current.className || ''}`);
      const usefulSize = area > 12000 && area < viewportArea * 1.15;

      if (usefulSize && (fixedish || named) && (hasShortAdLabel(current) || hasTiebaCloseControl(current))) {
        return current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return null;
  }

  function hasTiebaCloseControl(element) {
    if (element.querySelector('[aria-label*="关闭"], [title*="关闭"], [class*="close"], [class*="Close"]')) {
      return true;
    }

    const controls = element.querySelectorAll('button, [role="button"], a, span, div');
    const limit = Math.min(controls.length, 120);
    for (let index = 0; index < limit; index += 1) {
      const text = compactText(controls[index]);
      if (/^(×|x|X|关闭|关闭广告|跳过|跳过广告)$/.test(text)) return true;
    }

    return false;
  }

  function removeTiebaAdBackdrops() {
    selectAll(document, [
      '[class*="mask"]',
      '[class*="overlay"]',
      '[class*="modal"]',
      '[class*="dialog"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'body > div',
    ]).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;
      if (tiebaBackdropLooksLikeAdMask(element)) removeElement(element);
    });
  }

  function tiebaBackdropLooksLikeAdMask(element) {
    const style = getComputedStyle(element);
    if (style.position !== 'fixed') return false;

    const box = element.getBoundingClientRect();
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    if (area < viewportArea * 0.55) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedMask = /(mask|overlay|modal|dialog|popup|shade|ad|advert)/i.test(identity);
    const darkBackground = /rgba?\(\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)(?:\s*,\s*(?:0\.[2-9]|1(?:\.0)?))?\s*\)/i.test(style.backgroundColor);

    return parseZIndex(style.zIndex) >= 10 && (namedMask || darkBackground);
  }

  function unlockTiebaPage() {
    [document.documentElement, document.body].forEach((element) => {
      if (!element) return;
      element.style.removeProperty('overflow');
      element.style.removeProperty('position');
    });
  }

  function cleanupThreeDmForum(root) {
    if (!isThreeDmForumHost) return;

    const candidates = selectAll(root, [
      '.wp.a_h',
      '.a_pt',
      '.a_cn',
      'table.ad',
      'tr.ad',
      '#min_ad_con',
      '#ad_corner_close',
      '[id^="_matter_"]',
      'script[src*="fc.3dmgame.com/js/img.js"]',
      'script[src*="fc.3dmgame.com/gimg/"]',
      'iframe[src*="yeyou.3dmgame.com/tools/gamead"]',
      'a[href*="fc.3dmgame.com/cimg/"]',
      'img[src*="fc.3dmgame.com/uploads/"]',
    ]);

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const container = threeDmAdContainer(element);
      if (container) removeElement(container);
    });
  }

  function threeDmAdContainer(element) {
    try {
      if (element.matches([
        '.wp.a_h',
        '.a_pt',
        '.a_cn',
        'table.ad',
        'tr.ad',
        '#min_ad_con',
        '[id^="_matter_"]',
        'script[src*="fc.3dmgame.com/js/img.js"]',
        'script[src*="fc.3dmgame.com/gimg/"]',
        'iframe[src*="yeyou.3dmgame.com/tools/gamead"]',
      ].join(','))) {
        return element;
      }
    } catch (_) {
      // Ignore selector support differences.
    }

    const knownContainer = element.closest('[id^="_matter_"], #min_ad_con, .a_pt, .a_cn, .wp.a_h, table.ad, tr.ad');
    if (knownContainer) return knownContainer;

    if (element.id === 'ad_corner_close') {
      return element.closest('.a_cn') || element;
    }

    try {
      if (element.matches('a[href*="fc.3dmgame.com/cimg/"], img[src*="fc.3dmgame.com/uploads/"]')) {
        const adLink = element.closest('a[href*="fc.3dmgame.com/cimg/"]');
        return adLink || element;
      }
    } catch (_) {
      // Ignore selector support differences.
    }

    return null;
  }

  function cleanupBaiduFamily(root) {
    if (!isBaiduHost) return;

    const candidates = selectAll(root, [
      '#content_left > div',
      '#content_left > table',
      '#results > .result',
      '#content_right > table > tbody > tr > td > div',
      '#content_right > div > div > div',
      '#copyright + div',
      '.result',
      '.result-op',
      '.c-container',
      '.result-molecule',
      '.ec_wise_ad',
      '.ec_youxuan_card',
      '.page-banner',
      '[tpl]',
      '[mu]',
      '[cmatchid]',
      '[data-baodata]',
    ]);

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK)) return;
      cleanupBaiduRedirect(element);
      if (baiduCardLooksSponsored(element)) hideElement(element);
    });
  }

  function baiduCardLooksSponsored(element) {
    if (
      baiduMobileAppPromptLooksSponsored(element) ||
      baiduForcedDisplayLooksSponsored(element) ||
      baiduRightColumnLooksSponsored(element)
    ) {
      return true;
    }

    const identity = `${element.id || ''} ${element.className || ''} ${element.getAttribute('tpl') || ''}`;
    if (/(^|[-_\s])(ad|ads|advert|sponsor|tuiguang|fengchao|commercial)([-_\s]|$)/i.test(identity)) {
      return true;
    }

    try {
      if (element.matches([
        '.ec_wise_ad',
        '.ec_youxuan_card',
        '.page-banner',
        '[data-baodata]',
        '[data-tuiguang]',
        '[cmatchid]',
        '[data-click*="tuiguang"]',
        '[data-click*="fengchao"]',
        '[data-log*="tuiguang"]',
        '[data-log*="fengchao"]',
        '[data-module*="tuiguang"]',
        '[data-module*="fengchao"]',
      ].join(','))) {
        return true;
      }
    } catch (_) {
      // Ignore selector support differences.
    }

    const strongMarker = element.querySelector([
      '.ec-tuiguang',
      '.ec_wise_ad',
      '.ec_youxuan_card',
      '.page-banner',
      '.ec-ad',
      '.fengchao-ad',
      '.fengchao-wrap',
      '[data-baodata]',
      '[data-tuiguang]',
      '[cmatchid]',
      '[data-click*="tuiguang"]',
      '[data-click*="fengchao"]',
      '[data-log*="tuiguang"]',
      '[data-log*="fengchao"]',
      '[data-module*="tuiguang"]',
      '[data-module*="fengchao"]',
      '[class*="tuiguang"]',
      '[id*="tuiguang"]',
      '[class*="fengchao"]',
      '[id*="fengchao"]',
    ].join(','));

    if (strongMarker) return true;
    return hasShortAdLabel(element);
  }

  function cleanupBaiduRedirect(element) {
    const targetUrl = baiduResultTargetUrl(element);
    if (!targetUrl) return;

    const link = element.querySelector('a[href*="www.baidu.com/link"], a[href*="baidu.com/link?"], a[href^="/link?"]');
    if (!link) return;

    try {
      link.setAttribute('href', targetUrl);
      element.setAttribute('mu', '');
    } catch (_) {
      // Keep the page untouched if Baidu changes link protections.
    }
  }

  function baiduResultTargetUrl(element) {
    if ((element.getAttribute('tpl') || '') === 'short_video') return '';

    const mu = element.getAttribute('mu');
    if (isUsefulBaiduResultUrl(mu)) return mu;

    const dataLog = element.getAttribute('data-log');
    if (!dataLog) return '';

    try {
      const parsed = JSON.parse(dataLog);
      if (parsed && isUsefulBaiduResultUrl(parsed.mu)) return parsed.mu;
    } catch (_) {
      // Ignore non-JSON data-log payloads.
    }

    return '';
  }

  function isUsefulBaiduResultUrl(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url) && !/nourl/i.test(url);
  }

  function baiduMobileAppPromptLooksSponsored(element) {
    const previous = element.previousElementSibling;
    return Boolean(previous && previous.id === 'copyright' && element.querySelector('[ref="open"]'));
  }

  function baiduForcedDisplayLooksSponsored(element) {
    if (!element.parentElement || element.parentElement.id !== 'content_left') return false;
    const inlineStyle = element.getAttribute('style') || '';
    return /display\s*:\s*(table|block)\s*!important/i.test(inlineStyle);
  }

  function baiduRightColumnLooksSponsored(element) {
    try {
      if (element.matches('#content_right > table > tbody > tr > td > div') && element.id !== 'con-ar') {
        return true;
      }
    } catch (_) {
      // Ignore selector support differences.
    }

    if (!element.closest('#content_right')) return false;

    const links = element.querySelectorAll('a');
    const limit = Math.min(links.length, 40);
    for (let index = 0; index < limit; index += 1) {
      if (compactText(links[index]) === '广告') return true;
    }

    return false;
  }

  function hasShortAdLabel(element) {
    const labelNodes = element.querySelectorAll('span, a, em, i, b, div');
    const limit = Math.min(labelNodes.length, 90);

    for (let index = 0; index < limit; index += 1) {
      const text = compactText(labelNodes[index]);
      if (/^(广告|推广|商业推广|百度推广|推广链接|赞助)$/.test(text)) {
        return true;
      }
    }

    return false;
  }

  function cleanupBaiduMap(root) {
    if (!isBaiduMapHost) return;

    const candidates = selectAll(root, [
      '#moContainerId',
      '.mo-popup',
      '.moContainer',
      '.moContainerSuccess',
      '.dimensionalCode',
      '[class*="MobileDownload"]',
      '[class*="mobileDownload"]',
      '[class*="mobile-download"]',
      '[class*="downloadBanner"]',
      '[class*="DownloadBanner"]',
      '[class*="DynamicBanner"]',
      '[class*="dynamicBanner"]',
      '[class*="coupon"]',
      '[class*="Coupon"]',
      '[class*="banner"]',
      '[class*="Banner"]',
      '[style*="position: absolute"]',
      '[style*="position:absolute"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'a[href*="newclient.map.baidu.com/client/mapappdownload"]',
      'a[href*="map.baidu.com/zt/y2015/mapdownload"]',
      'a[href*="itunes.apple.com/cn/app/id452186370"]',
      'img[src*="qrcode.map.baidu.com"]',
      'img[src*="bcscdn.baidu.com/opnimg"]',
      'body > div',
    ]);

    let removedPromo = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const promo = baiduMapPromoContainer(element);
      if (promo) {
        removeElement(promo);
        removedPromo = true;
      }
    });

    if (removedPromo || document.getElementById('mapmask')) {
      cleanupBaiduMapPromoMask();
    }
  }

  function baiduMapPromoContainer(element) {
    const stableContainer = closestBaiduMapStablePromo(element);
    if (stableContainer) return stableContainer;

    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 7) {
      if (!(current instanceof HTMLElement)) break;
      if (baiduMapCoreContainer(current)) break;

      const hasPromoSignal = baiduMapPromoTextLooksSponsored(compactText(current)) || baiduMapPromoAssetLooksSponsored(current);
      if (hasPromoSignal && baiduMapPromoBoxLooksRemovable(current)) {
        return current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return null;
  }

  function closestBaiduMapStablePromo(element) {
    try {
      const container = element.closest('#moContainerId, .mo-popup, .moContainer, .moContainerSuccess');
      if (!(container instanceof HTMLElement)) return null;
      return container.closest('.mo-popup') || container;
    } catch (_) {
      return null;
    }
  }

  function baiduMapCoreContainer(element) {
    try {
      return element.matches('html, body, #maps, #MapHolder, #mapHolder, #MapContainer, #map-container, #main_map, #mainMap, #mask, #sole-searchbox-content, #card-0, #left-panel');
    } catch (_) {
      return false;
    }
  }

  function baiduMapPromoTextLooksSponsored(text) {
    return /下载百度(?:手机)?地图|百度地图\s*APP|领\s*100\s*元券|领100|扫码.{0,8}领取|酒店满减券|满\s*100|最高减\s*100|扫描二维码.*下载|AppStore搜索.?百度地图|出门就靠百度地图|感谢您使用百度手机地图|发送免费短信下载|重新下载/i.test(text);
  }

  function baiduMapPromoAssetLooksSponsored(element) {
    const assetPattern = /newclient\.map\.baidu\.com\/client\/mapappdownload|map\.baidu\.com\/zt\/y2015\/mapdownload|qrcode\.map\.baidu\.com|bcscdn\.baidu\.com\/opnimg|itunes\.apple\.com\/cn\/app\/id452186370/i;
    const ownValues = ['href', 'src', 'data', 'style'].map((attr) => element.getAttribute(attr) || '').join(' ');
    if (assetPattern.test(ownValues)) return true;

    try {
      return Boolean(element.querySelector([
        'a[href*="newclient.map.baidu.com/client/mapappdownload"]',
        'a[href*="map.baidu.com/zt/y2015/mapdownload"]',
        'a[href*="itunes.apple.com/cn/app/id452186370"]',
        'img[src*="qrcode.map.baidu.com"]',
        'img[src*="bcscdn.baidu.com/opnimg"]',
        '[style*="qrcode.map.baidu.com"]',
        '[style*="bcscdn.baidu.com/opnimg"]',
      ].join(',')));
    } catch (_) {
      return false;
    }
  }

  function baiduMapPromoBoxLooksRemovable(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 80 || box.height < 35) return false;
    if (box.width > window.innerWidth * 0.75 || box.height > window.innerHeight * 0.7) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedPromo = /(mobile|download|banner|coupon|qrcode|dynamic|moContainer|mo-popup)/i.test(identity);
    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;

    return isBaiduMapTopRightFloatingPromo(element) || (floating && namedPromo) || (namedPromo && box.width <= 700 && box.height <= 500);
  }

  function isBaiduMapTopRightFloatingPromo(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 120 || box.width > 520 || box.height < 60 || box.height > 360) return false;
    if (box.top < -4 || box.top > Math.max(220, window.innerHeight * 0.35)) return false;
    if (box.left < Math.max(300, window.innerWidth * 0.42)) return false;
    if (box.right > window.innerWidth + 8) return false;

    const style = getComputedStyle(element);
    return /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;
  }

  function cleanupBaiduMapPromoMask() {
    const mask = document.getElementById('mapmask');
    if (!(mask instanceof HTMLElement) || mask.hasAttribute(MARK)) return;

    const livePromo = document.querySelector('#moContainerId, .mo-popup, .moContainer, .moContainerSuccess');
    if (livePromo instanceof HTMLElement) {
      const stillPromo = baiduMapPromoTextLooksSponsored(compactText(livePromo)) || baiduMapPromoAssetLooksSponsored(livePromo);
      if (!stillPromo) return;
    }

    removeElement(mask);
  }

  function cleanupZcoolFamily(root) {
    if (!isZcoolHost || !/^\/work\//.test(location.pathname)) return;

    const candidates = selectAll(root, [
      '.likeRecommendList',
      '.recommend-covers',
      '.hellorfContent',
      '.recommendTitle',
      '.recommend-title',
      '[class*="recommend"]',
      '[class*="Recommend"]',
      '[class*="hellorf"]',
      'a[href*="/assets/"][href*="project=info_bottom"]',
      'span',
    ]);

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const container = zcoolRecommendedAssetsContainer(element);
      if (container) removeElement(container);
    });
  }

  function zcoolRecommendedAssetsContainer(element) {
    try {
      const outer = element.closest('.likeRecommendList');
      if (outer instanceof HTMLElement) return outer;

      const inner = element.closest('.recommend-covers, .hellorfContent');
      if (inner instanceof HTMLElement) return inner;
    } catch (_) {
      // Ignore selector support differences.
    }

    if (!zcoolRecommendedAssetsSignal(element) && compactText(element) !== '推荐素材') return null;

    let current = element;
    let candidate = null;
    let depth = 0;

    while (current && current !== document.body && depth < 7) {
      if (!(current instanceof HTMLElement)) break;
      if (zcoolNormalWorkRecommendation(current)) break;

      if (zcoolRecommendedAssetsSignal(current)) {
        candidate = current;
        if (zcoolNormalWorkRecommendation(current.nextElementSibling)) return current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return candidate;
  }

  function zcoolRecommendedAssetsSignal(element) {
    if (!(element instanceof HTMLElement)) return false;

    const text = compactText(element);
    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedAssets = /likeRecommendList|recommend-covers|hellorfContent|recommendTitle|recommend-title/i.test(identity);
    const titleSignal = text === '推荐素材' || Boolean(element.querySelector('.recommend-title, .recommendTitle'));
    const assetSignal = zcoolRecommendedAssetsLink(element);

    return (namedAssets || titleSignal) && (assetSignal || /推荐素材/.test(text));
  }

  function zcoolRecommendedAssetsLink(element) {
    try {
      if (element.matches('a[href*="/assets/"][href*="project=info_bottom"]')) return true;
      return Boolean(element.querySelector('a[href*="/assets/"][href*="project=info_bottom"], a.img-card[href*="/assets/"]'));
    } catch (_) {
      return false;
    }
  }

  function zcoolNormalWorkRecommendation(element) {
    if (!(element instanceof HTMLElement)) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    if (/(^|[-_\s])workRecommend([-_\s]|$)|feildTitle_text|recommendCardItem/i.test(identity)) return true;

    return compactText(element) === '你可能喜欢';
  }

  function cleanupD3x7Family(root) {
    if (!isD3x7Host) return;

    const candidates = selectAll(root, [
      '.layui-layer',
      '.layui-layer-shade',
      '.layui-layer-setwin',
      '.layui-layer-close',
      '.swal2-container',
      '.modal',
      '.modal-backdrop',
      '.v-modal',
      '.el-overlay',
      '.el-dialog__wrapper',
      '.popup',
      '.popup-mask',
      '.dialog',
      '.overlay',
      '.mask',
      '[class*="layui-layer"]',
      '[class*="modal"]',
      '[class*="popup"]',
      '[class*="dialog"]',
      '[class*="overlay"]',
      '[class*="mask"]',
      '[class*="shade"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      '[style*="position: absolute"]',
      '[style*="position:absolute"]',
      'body > div',
      'div',
      'p',
      'span',
      'strong',
    ]);

    let removedPrompt = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const prompt = d3x7PromptContainer(element);
      if (prompt) {
        removeElement(prompt);
        removedPrompt = true;
      }
    });

    if (removedPrompt) cleanupD3x7PromptArtifacts(true);
    else unlockD3x7Page();
  }

  function d3x7PromptContainer(element) {
    const stableContainer = closestD3x7PromptShell(element);
    if (stableContainer) return stableContainer;

    if (!d3x7PromptTextLooksLike(compactText(element))) return null;

    let current = element;
    let best = null;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (d3x7PageRoot(current)) break;

      if (d3x7PromptTextLooksLike(compactText(current))) {
        if (d3x7FullscreenOverlay(current)) return current;
        if (d3x7PromptBoxLooksRemovable(current)) best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function closestD3x7PromptShell(element) {
    try {
      const container = element.closest('.layui-layer, .swal2-container, .modal, .el-dialog__wrapper, .popup, .dialog, [role="dialog"]');
      if (!(container instanceof HTMLElement)) return null;
      if (d3x7PromptTextLooksLike(compactText(container)) || d3x7PromptTextLooksLike(compactText(element))) return container;
    } catch (_) {
      // Ignore selector support differences.
    }

    return null;
  }

  function d3x7PromptTextLooksLike(text) {
    return /有售后裙|可解答|放心咯|支持\s*3D\s*盘|天翼.*迅雷.*阿里.*夸克|阿里下载|下载不限速|速度放心|赠云盘会员高速下载|网盘会员高速下载/i.test(text);
  }

  function d3x7PromptBoxLooksRemovable(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 120 || box.height < 45) return false;
    if (box.width > window.innerWidth * 0.8 || box.height > window.innerHeight * 0.75) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedPrompt = /(layui-layer|modal|popup|dialog|notice|tips?|overlay|mask|shade)/i.test(identity);
    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;

    return namedPrompt || floating || d3x7CenteredPromptPanel(element);
  }

  function d3x7CenteredPromptPanel(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 180 || box.width > 560 || box.height < 70 || box.height > 320) return false;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const nearCenterX = Math.abs(centerX - window.innerWidth / 2) < window.innerWidth * 0.25;
    const nearCenterY = Math.abs(centerY - window.innerHeight / 2) < window.innerHeight * 0.25;

    return nearCenterX && nearCenterY;
  }

  function d3x7FullscreenOverlay(element) {
    const box = element.getBoundingClientRect();
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    if (area < viewportArea * 0.55 || area > viewportArea * 1.25) return false;

    const style = getComputedStyle(element);
    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedOverlay = /(modal|popup|dialog|overlay|mask|shade|layui-layer)/i.test(identity);

    return namedOverlay || /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) >= 10;
  }

  function cleanupD3x7PromptArtifacts(force) {
    let removedArtifact = false;

    selectAll(document, [
      '.layui-layer-shade',
      '.layui-layer-setwin',
      '.layui-layer-close',
      '.modal-backdrop',
      '.v-modal',
      '[class*="layui-layer-shade"]',
      '[class*="modal-backdrop"]',
      '[class*="popup-mask"]',
      '[class*="overlay"]',
      '[class*="mask"]',
      '[class*="shade"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'button',
      '[role="button"]',
      'a',
      'span',
      'div',
    ]).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      if (force && (d3x7BackdropLooksLikePromptMask(element) || d3x7PromptCloseControl(element))) {
        removeElement(element);
        removedArtifact = true;
      }
    });

    if (force || removedArtifact) unlockD3x7Page();
  }

  function d3x7BackdropLooksLikePromptMask(element) {
    const style = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    if (area < viewportArea * 0.55) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedMask = /(overlay|mask|shade|modal-backdrop|layui-layer-shade|popup)/i.test(identity);
    const darkBackground = /rgba?\(\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)(?:\s*,\s*(?:0\.[2-9]|1(?:\.0)?))?\s*\)/i.test(style.backgroundColor);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) >= 10;

    return floating && (namedMask || darkBackground || /blur\(/i.test(style.backdropFilter || ''));
  }

  function d3x7PromptCloseControl(element) {
    const text = compactText(element);
    if (!/^(×|x|X|关闭)$/.test(text)) return false;

    const box = element.getBoundingClientRect();
    if (box.width > 80 || box.height > 80 || box.width < 12 || box.height < 12) return false;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const nearCenterX = Math.abs(centerX - window.innerWidth / 2) < window.innerWidth * 0.18;
    const belowPromptCenter = centerY > window.innerHeight * 0.45 && centerY < window.innerHeight * 0.68;

    return nearCenterX && belowPromptCenter;
  }

  function unlockD3x7Page() {
    [document.documentElement, document.body].forEach((element) => {
      if (!element) return;
      element.style.removeProperty('overflow');
      element.style.removeProperty('position');
      element.classList.remove('modal-open', 'swal2-shown', 'layui-layer-body');
    });

    selectAll(document, ['[style*="filter"]', '[style*="backdrop-filter"]']).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;

      const box = element.getBoundingClientRect();
      const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
      if (box.width * box.height < viewportArea * 0.4) return;

      const style = getComputedStyle(element);
      if (/blur\(/i.test(style.filter || '')) element.style.setProperty('filter', 'none', 'important');
      if (/blur\(/i.test(style.backdropFilter || '')) element.style.setProperty('backdrop-filter', 'none', 'important');
    });
  }

  function d3x7PageRoot(element) {
    try {
      return element.matches('html, body, #app, #root, #__next, #page, main');
    } catch (_) {
      return false;
    }
  }

  function cleanupQuarkPanFamily(root) {
    if (!isQuarkPanHost) return;

    cleanupQuarkPanGlobalConfig();

    const candidates = selectAll(root, [
      'img[src]',
      'a[href]',
      'button',
      '[role="button"]',
      '[class*="right"]',
      '[class*="Right"]',
      '[class*="side"]',
      '[class*="Side"]',
      '[class*="banner"]',
      '[class*="Banner"]',
      '[class*="client"]',
      '[class*="Client"]',
      '[class*="download"]',
      '[class*="Download"]',
      '[class*="assistant"]',
      '[class*="Assistant"]',
      '[style*="broccoli-static.quark.cn"]',
      '[style*="yes-file.quark.cn"]',
      '[style*="yes-file.uc.cn"]',
      '[style*="image.quark.cn"]',
      'aside',
      'section',
      'div',
      'span',
    ]);

    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const promo = quarkPanPromoContainer(element);
      if (promo) removeElement(promo);
    });

    compactQuarkPanShareLayout();
  }

  function cleanupQuarkPanGlobalConfig() {
    try {
      const shareConfig = window.globalConfig && window.globalConfig.share_config;
      if (shareConfig && Array.isArray(shareConfig.rightSideBanners) && shareConfig.rightSideBanners.length) {
        shareConfig.rightSideBanners = [];
      }
    } catch (_) {
      // Keep cleanup DOM-only if the page protects its runtime config.
    }
  }

  function quarkPanPromoContainer(element) {
    const stable = closestQuarkPanStablePromo(element);
    if (stable) return stable;

    const hasSignal = quarkPanPromoTextLooksLike(compactText(element)) || quarkPanPromoAssetLooksLike(element);
    if (!hasSignal) return null;

    let current = element;
    let best = null;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (quarkPanCoreContainer(current)) break;

      const textSignal = quarkPanPromoTextLooksLike(compactText(current));
      const assetSignal = quarkPanPromoAssetLooksLike(current);
      if ((textSignal || assetSignal) && quarkPanPromoBoxLooksRemovable(current, textSignal, assetSignal)) {
        best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function closestQuarkPanStablePromo(element) {
    try {
      const asset = element.closest([
        'a[href*="yuque.com/lihui-yveuk/mfql7o/areokxqzcf4leikt"]',
        'img[src*="broccoli-static.quark.cn/file/others/2026/3/"]',
        'img[src*="yes-file.quark.cn/file/1772184308304"]',
        'img[src*="yes-file.uc.cn/file/1725004739217"]',
        'img[src*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
        '[style*="broccoli-static.quark.cn/file/others/2026/3/"]',
        '[style*="yes-file.quark.cn/file/1772184308304"]',
        '[style*="yes-file.uc.cn/file/1725004739217"]',
        '[style*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
      ].join(','));

      if (!(asset instanceof HTMLElement)) return null;

      let current = asset;
      let best = null;
      let depth = 0;
      while (current && current !== document.body && depth < 7) {
        if (!(current instanceof HTMLElement)) break;
        if (quarkPanCoreContainer(current)) break;
        if (quarkPanRightPromoColumn(current) || quarkPanSmallPromoCard(current)) best = current;
        current = current.parentElement;
        depth += 1;
      }

      return best || asset;
    } catch (_) {
      return null;
    }
  }

  function quarkPanPromoTextLooksLike(text) {
    return /保存成功.{0,12}(立享|1024\s*GB)|1024\s*GB|新用户.{0,8}保存成功|立即下载|下载助手|打开客户端|去客户端查看|老用户回馈|夸克网盘.{0,12}(电脑|客户端|高效)|超大空间.{0,8}超速下载/i.test(text);
  }

  function quarkPanPromoAssetLooksLike(element) {
    const attrs = ['href', 'src', 'data', 'style'].map((attr) => element.getAttribute(attr) || '').join(' ');
    const assetPattern = /yuque\.com\/lihui-yveuk\/mfql7o\/areokxqzcf4leikt|broccoli-static\.quark\.cn\/file\/others\/2026\/3\/|yes-file\.quark\.cn\/file\/1772184308304|yes-file\.uc\.cn\/file\/1725004739217|image\.quark\.cn\/s\/uae\/g\/3o\/cms\/resource\/1702472767194/i;
    if (assetPattern.test(attrs)) return true;

    try {
      return Boolean(element.querySelector([
        'a[href*="yuque.com/lihui-yveuk/mfql7o/areokxqzcf4leikt"]',
        'img[src*="broccoli-static.quark.cn/file/others/2026/3/"]',
        'img[src*="yes-file.quark.cn/file/1772184308304"]',
        'img[src*="yes-file.uc.cn/file/1725004739217"]',
        'img[src*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
        '[style*="broccoli-static.quark.cn/file/others/2026/3/"]',
        '[style*="yes-file.quark.cn/file/1772184308304"]',
        '[style*="yes-file.uc.cn/file/1725004739217"]',
        '[style*="image.quark.cn/s/uae/g/3o/cms/resource/1702472767194"]',
      ].join(',')));
    } catch (_) {
      return false;
    }
  }

  function quarkPanPromoBoxLooksRemovable(element, textSignal, assetSignal) {
    if (quarkPanCoreContainer(element)) return false;
    if (quarkPanRightPromoColumn(element) && assetSignal) return true;
    if (quarkPanSmallPromoCard(element) && (assetSignal || textSignal)) return true;
    if (quarkPanFloatingPrompt(element) && textSignal) return true;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedPromo = /(banner|ad|promo|client|download|assistant|guide|right.?side)/i.test(identity);
    return namedPromo && (assetSignal || (textSignal && quarkPanSmallPromoCard(element)));
  }

  function quarkPanRightPromoColumn(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 80 || box.width > 360 || box.height < 90 || box.height > window.innerHeight * 0.75) return false;
    if (box.left < window.innerWidth * 0.58) return false;
    if (box.top > window.innerHeight * 0.35) return false;
    return box.right <= window.innerWidth + 4;
  }

  function quarkPanSmallPromoCard(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 56 || box.width > 260 || box.height < 30 || box.height > 360) return false;
    return box.left > window.innerWidth * 0.55 || box.right < window.innerWidth * 0.18 || box.top < 90;
  }

  function quarkPanFloatingPrompt(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 50 || box.width > 260 || box.height < 24 || box.height > 100) return false;

    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;
    const leftHelper = box.left < 8 && box.top > window.innerHeight * 0.25 && box.top < window.innerHeight * 0.75;
    const topClient = box.top < 80 && box.left > window.innerWidth * 0.45;

    return floating && (leftHelper || topClient);
  }

  function quarkPanCoreContainer(element) {
    try {
      return element.matches('html, body, #ice-container, main, [class*="file-list"], [class*="FileList"], [class*="share-file"], [class*="ShareFile"], [class*="ant-table"], [class*="footer"], [class*="Footer"]');
    } catch (_) {
      return false;
    }
  }

  function compactQuarkPanShareLayout() {
    selectAll(document, ['[style*="margin-right"]', '[style*="padding-right"]', '[style*="width"]']).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK)) return;
      if (!quarkPanShareMainPanel(element)) return;

      element.style.setProperty('margin-right', '0', 'important');
      element.style.setProperty('padding-right', '0', 'important');
      element.style.setProperty('max-width', 'none', 'important');
    });
  }

  function quarkPanShareMainPanel(element) {
    const box = element.getBoundingClientRect();
    if (box.width < window.innerWidth * 0.35 || box.height < window.innerHeight * 0.45) return false;
    if (box.left > window.innerWidth * 0.35 || box.right < window.innerWidth * 0.55) return false;

    try {
      return Boolean(element.querySelector('[class*="file-list"], [class*="FileList"], [class*="ant-table"], [class*="share-file"], [class*="ShareFile"]'));
    } catch (_) {
      return false;
    }
  }

  function cleanupOpenArtFamily(root) {
    if (!isOpenArtHost) return;

    const candidates = selectAll(root, [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '[data-state="open"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[class*="dialog"]',
      '[class*="Dialog"]',
      '[class*="popover"]',
      '[class*="Popover"]',
      '[class*="banner"]',
      '[class*="Banner"]',
      '[class*="promotion"]',
      '[class*="Promotion"]',
      '[class*="offer"]',
      '[class*="Offer"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'button',
      '[role="button"]',
      'a',
      'section',
      'div',
    ]);

    let removedPromo = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const promo = openArtPromoContainer(element);
      if (promo) {
        removeElement(promo);
        removedPromo = true;
      }
    });

    if (removedPromo) unlockOpenArtPage();
  }

  function openArtPromoContainer(element) {
    const stableContainer = closestOpenArtPromoShell(element);
    if (stableContainer) return stableContainer;

    if (!openArtPromoTextLooksLike(compactText(element))) return null;

    let current = element;
    let best = null;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (openArtPageRoot(current)) break;

      if (openArtPromoTextLooksLike(compactText(current)) && openArtPromoBoxLooksRemovable(current)) {
        best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function closestOpenArtPromoShell(element) {
    try {
      const container = element.closest([
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="dialog"]',
        '[class*="Dialog"]',
        '[class*="popover"]',
        '[class*="Popover"]',
      ].join(','));
      if (container instanceof HTMLElement && openArtPromoTextLooksLike(compactText(container))) return container;
    } catch (_) {
      // Ignore selector support differences.
    }

    return null;
  }

  function openArtPromoTextLooksLike(text) {
    const strongSignal = /DIRECT MORE,\s*PAY LESS|What.?s New\s*-\s*June\s*2026|Creating your video with Director|up to\s*50%\s*cheaper|Limited-time offer|UP TO\s*27%\s*OFF|annual plans/i.test(text);
    const actionSignal = /Start Directing|View Plan/i.test(text);
    const nearbyPromoContext = /DIRECT MORE|What.?s New|Director is now|cheaper|Limited-time offer|UP TO\s*27%\s*OFF|annual plans/i.test(text);
    return strongSignal || (actionSignal && nearbyPromoContext);
  }

  function openArtPromoBoxLooksRemovable(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 120 || box.height < 30) return false;
    if (openArtTopOfferBar(element)) return true;
    if (box.width > window.innerWidth * 0.9 || box.height > window.innerHeight * 0.9) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedPromo = /(modal|dialog|popover|banner|promo|promotion|offer|notice|announcement)/i.test(identity);
    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;

    return namedPromo || floating || openArtCenteredModal(element);
  }

  function openArtCenteredModal(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 280 || box.width > 780 || box.height < 180 || box.height > window.innerHeight * 0.9) return false;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const nearCenterX = Math.abs(centerX - window.innerWidth / 2) < window.innerWidth * 0.28;
    const nearCenterY = Math.abs(centerY - window.innerHeight / 2) < window.innerHeight * 0.36;

    return nearCenterX && nearCenterY;
  }

  function openArtTopOfferBar(element) {
    const box = element.getBoundingClientRect();
    if (box.top > 80 || box.height > 90 || box.width < window.innerWidth * 0.45) return false;
    return /Limited-time offer|UP TO\s*27%\s*OFF|View Plan/i.test(compactText(element));
  }

  function openArtPageRoot(element) {
    try {
      return element.matches('html, body, #root, #__next, #app, main, [class*="sidebar"], [class*="Sidebar"]');
    } catch (_) {
      return false;
    }
  }

  function unlockOpenArtPage() {
    [document.documentElement, document.body].forEach((element) => {
      if (!element) return;
      element.style.removeProperty('overflow');
      element.style.removeProperty('position');
      element.style.removeProperty('padding-right');
      element.classList.remove('modal-open', 'overflow-hidden');
    });
  }

  function cleanupLiblibFamily(root) {
    if (!isLiblibHost) return;

    const candidates = selectAll(root, [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '[class*="login"]',
      '[class*="Login"]',
      '[class*="signin"]',
      '[class*="Sign"]',
      '[class*="point"]',
      '[class*="Point"]',
      '[class*="score"]',
      '[class*="Score"]',
      '[class*="reward"]',
      '[class*="Reward"]',
      '[class*="invite"]',
      '[class*="Invite"]',
      '[class*="gift"]',
      '[class*="Gift"]',
      '[class*="popover"]',
      '[class*="Popover"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[class*="mask"]',
      '[class*="Mask"]',
      '[class*="overlay"]',
      '[class*="Overlay"]',
      '[class*="guide"]',
      '[class*="Guide"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'button',
      '[role="button"]',
      'a',
      'aside',
      'section',
    ]);

    let removedPrompt = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const prompt = liblibLoginPromptContainer(element);
      if (prompt) {
        removeElement(prompt);
        removedPrompt = true;
      }
    });

    if (removedPrompt) cleanupLiblibLoginPromptArtifacts(true);
  }

  function liblibLoginPromptContainer(element) {
    const stableContainer = closestLiblibLoginPromptShell(element);
    if (stableContainer) return stableContainer;

    let current = element;
    let best = null;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (liblibPageRoot(current)) break;

      if (liblibLoginPromptTextLooksLike(compactText(current)) && liblibLoginPromptBoxLooksRemovable(current)) {
        best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function closestLiblibLoginPromptShell(element) {
    try {
      const container = element.closest([
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[class*="login"]',
        '[class*="Login"]',
        '[class*="signin"]',
        '[class*="Sign"]',
        '[class*="point"]',
        '[class*="Point"]',
        '[class*="reward"]',
        '[class*="Reward"]',
        '[class*="popover"]',
        '[class*="Popover"]',
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="mask"]',
        '[class*="Mask"]',
        '[class*="overlay"]',
        '[class*="Overlay"]',
        '[class*="guide"]',
        '[class*="Guide"]',
        '[style*="position: fixed"]',
        '[style*="position:fixed"]',
      ].join(','));
      if (!(container instanceof HTMLElement)) return null;
      if (liblibLoginPromptTextLooksLike(compactText(container)) && liblibLoginPromptBoxLooksRemovable(container)) return container;
    } catch (_) {
      // Ignore selector support differences.
    }

    return null;
  }

  function liblibLoginPromptTextLooksLike(text) {
    const strongSignal = /登录每天领积分|真的要离开吗|开启您的AI创作之旅|新用户登录即送|每天赠送\s*20\s*积分|登录即送\s*20\s*积分\/天|创意图片\s*约\s*40\s*张|创意视频\s*约\s*2\s*个|100\+?项尖端新图片\/视频模型随心用|永久云存储空间\s*3GB|免费存储空间\s*3GB|海量会员模型免费试用|优质模型\s*免费试用/i.test(text);
    const actionSignal = /立即登录领取|登录领取积分/i.test(text);
    const rewardContext = /积分|AI创作|模型随心用|云存储|存储空间|会员模型|优质模型|免费试用|创意图片|创意视频/i.test(text);
    return strongSignal || (actionSignal && rewardContext);
  }

  function liblibLoginPromptBoxLooksRemovable(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 180 || box.height < 100) return false;
    if (box.width > 520 || box.height > Math.min(520, window.innerHeight * 0.7)) return false;
    if (liblibTopRightLoginPrompt(element)) return true;
    if (liblibCenteredLoginPrompt(element)) return true;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedPrompt = /(login|signin|point|score|reward|invite|gift|popover|modal|guide|benefit|leave|exit)/i.test(identity);
    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;

    return namedPrompt || floating;
  }

  function liblibTopRightLoginPrompt(element) {
    const box = element.getBoundingClientRect();
    if (box.top > Math.min(180, window.innerHeight * 0.25)) return false;
    if (box.left < window.innerWidth * 0.55) return false;
    return box.right >= window.innerWidth - 40;
  }

  function liblibCenteredLoginPrompt(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 280 || box.width > 620 || box.height < 180 || box.height > Math.min(560, window.innerHeight * 0.75)) return false;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const nearCenterX = Math.abs(centerX - window.innerWidth / 2) < window.innerWidth * 0.24;
    const nearCenterY = Math.abs(centerY - window.innerHeight / 2) < window.innerHeight * 0.28;

    return nearCenterX && nearCenterY;
  }

  function cleanupLiblibLoginPromptArtifacts(force) {
    let removedArtifact = false;

    selectAll(document, [
      '[class*="mask"]',
      '[class*="Mask"]',
      '[class*="overlay"]',
      '[class*="Overlay"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'body > div',
    ]).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      if (force && liblibBackdropLooksLikeLoginMask(element)) {
        removeElement(element);
        removedArtifact = true;
      }
    });

    if (force || removedArtifact) unlockLiblibPage();
  }

  function liblibBackdropLooksLikeLoginMask(element) {
    if (liblibPageRoot(element)) return false;

    const box = element.getBoundingClientRect();
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    if (area < viewportArea * 0.45) return false;

    const style = getComputedStyle(element);
    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedMask = /(mask|overlay|modal|dialog|popup|drawer|login|signin|leave|exit)/i.test(identity);
    const darkBackground = /rgba?\(\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)(?:\s*,\s*(?:0\.[2-9]|1(?:\.0)?))?\s*\)/i.test(style.backgroundColor);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) >= 10;

    return floating && (namedMask || darkBackground);
  }

  function unlockLiblibPage() {
    [document.documentElement, document.body].forEach((element) => {
      if (!element) return;
      element.style.removeProperty('overflow');
      element.style.removeProperty('position');
      element.style.removeProperty('padding-right');
      element.classList.remove('modal-open', 'overflow-hidden', 'no-scroll', 'lock-scroll');
    });
  }

  function liblibPageRoot(element) {
    try {
      return element.matches('html, body, #app, #root, #__next, main');
    } catch (_) {
      return false;
    }
  }

  function setupXiaohongshuLoginGate() {
    if (!isXiaohongshuHost || xiaohongshuLoginGateInstalled) return;
    xiaohongshuLoginGateInstalled = true;

    const markManualLoginIntent = (event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      if (!xiaohongshuExplicitLoginTrigger(event.target)) return;

      xiaohongshuManualLoginUntil = Date.now() + 5 * 60 * 1000;
    };

    const markReplyExpandIntent = (event) => {
      if (!event.isTrusted || !(event.target instanceof Element)) return;
      if (!xiaohongshuReplyExpandTrigger(event.target)) return;

      xiaohongshuReplyExpandUntil = Date.now() + 8000;
      scheduleXiaohongshuReplyCleanup();
    };

    document.addEventListener('pointerdown', markManualLoginIntent, true);
    document.addEventListener('click', markManualLoginIntent, true);
    document.addEventListener('pointerdown', markReplyExpandIntent, true);
    document.addEventListener('click', markReplyExpandIntent, true);
    document.addEventListener('keydown', (event) => {
      if (!event.isTrusted || !['Enter', ' '].includes(event.key) || !(event.target instanceof Element)) return;
      if (xiaohongshuExplicitLoginTrigger(event.target)) {
        xiaohongshuManualLoginUntil = Date.now() + 5 * 60 * 1000;
      }
      if (xiaohongshuReplyExpandTrigger(event.target)) {
        xiaohongshuReplyExpandUntil = Date.now() + 8000;
        scheduleXiaohongshuReplyCleanup();
      }
    }, true);
  }

  function cleanupXiaohongshuFamily(root) {
    if (!isXiaohongshuHost) return;

    enhanceXiaohongshuReplyControls(root);

    if (xiaohongshuManualLoginAllowed() && !xiaohongshuReplyExpandActive()) return;

    const candidates = selectAll(root, [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '[class*="login"]',
      '[class*="Login"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[class*="dialog"]',
      '[class*="Dialog"]',
      '[class*="mask"]',
      '[class*="Mask"]',
      '[class*="overlay"]',
      '[class*="Overlay"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'button',
      '[role="button"]',
      'a',
      'section',
      'div',
    ]);

    let removedLogin = false;
    candidates.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      const popup = xiaohongshuLoginPopupContainer(element);
      if (popup) {
        removeElement(popup);
        removedLogin = true;
      }
    });

    if (removedLogin) cleanupXiaohongshuLoginArtifacts(true);
  }

  function xiaohongshuManualLoginAllowed() {
    return Date.now() < xiaohongshuManualLoginUntil;
  }

  function xiaohongshuReplyExpandActive() {
    return Date.now() < xiaohongshuReplyExpandUntil;
  }

  function scheduleXiaohongshuReplyCleanup() {
    [60, 250, 800, 1800, 3600].forEach((delay) => {
      setTimeout(() => cleanupXiaohongshuFamily(document), delay);
    });
  }

  function enhanceXiaohongshuReplyControls(root) {
    selectAll(root, [
      'button',
      'a',
      '[role="button"]',
      '[tabindex]',
      'span',
      'div',
    ]).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;
      if (!xiaohongshuReplyExpandControl(element)) return;

      restoreXiaohongshuReplyExpandControl(element);
      const shell = xiaohongshuReplyExpandShell(element);
      if (shell) restoreXiaohongshuReplyExpandControl(shell);
    });
  }

  function xiaohongshuReplyExpandTrigger(target) {
    let current = target;
    let depth = 0;

    while (current && current !== document.body && depth < 5) {
      if (!(current instanceof HTMLElement)) break;
      if (xiaohongshuReplyExpandControl(current)) return true;

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function xiaohongshuReplyExpandControl(element) {
    const text = compactText(element);
    if (!/^展开\s*\d*\s*条?回复$|^展开\s*全部回复$|^查看更多回复$|^查看\s*\d*\s*条?回复$|^更多回复$/i.test(text)) return false;

    const box = element.getBoundingClientRect();
    if (box.width < 24 || box.width > 220 || box.height < 10 || box.height > 60) return false;

    return true;
  }

  function xiaohongshuReplyExpandShell(element) {
    let current = element.parentElement;
    let best = element;
    let depth = 0;

    while (current && current !== document.body && depth < 3) {
      if (!(current instanceof HTMLElement)) break;

      const text = compactText(current);
      const box = current.getBoundingClientRect();
      if (/展开|查看更多|更多回复|查看/.test(text) && /回复/.test(text) && box.width <= 280 && box.height <= 80) {
        best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function restoreXiaohongshuReplyExpandControl(element) {
    element.removeAttribute('disabled');
    element.setAttribute('aria-disabled', 'false');
    element.style.setProperty('pointer-events', 'auto', 'important');
    element.style.setProperty('cursor', 'pointer', 'important');
    element.style.setProperty('opacity', '1', 'important');
    element.style.setProperty('user-select', 'auto', 'important');
    if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '0');
  }

  function xiaohongshuExplicitLoginTrigger(target) {
    let current = target;
    let depth = 0;

    while (current && current !== document.body && depth < 5) {
      if (!(current instanceof HTMLElement)) break;

      if (xiaohongshuLoginTriggerControl(current)) return true;

      current = current.parentElement;
      depth += 1;
    }

    return false;
  }

  function xiaohongshuLoginTriggerControl(element) {
    const text = compactText(element);
    const attrs = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-testid'),
      element.id,
      element.className,
    ].filter(Boolean).join(' ');
    const label = `${text} ${attrs}`.trim();

    if (!/登录|log.?in|sign.?in/i.test(label)) return false;

    let interactive = false;
    try {
      interactive = element.matches('button, a, [role="button"], input[type="button"], input[type="submit"], [tabindex], [class*="login"], [class*="Login"]');
    } catch (_) {
      interactive = false;
    }
    if (!interactive) return false;

    const shortText = text.length <= 12;
    const exactLoginText = /^(登录|立即登录|登录\/注册|登录 \/ 注册|手机号登录|小红书登录)$/.test(text);
    const namedLoginButton = /(login|sign.?in|登录)/i.test(attrs) && /登录/.test(label) && shortText;

    return exactLoginText || namedLoginButton;
  }

  function xiaohongshuLoginPopupContainer(element) {
    const stableContainer = closestXiaohongshuLoginShell(element);
    if (stableContainer) return stableContainer;

    if (!xiaohongshuLoginPopupTextLooksLike(compactText(element))) return null;

    let current = element;
    let best = null;
    let depth = 0;

    while (current && current !== document.body && depth < 8) {
      if (!(current instanceof HTMLElement)) break;
      if (xiaohongshuPageRoot(current)) break;

      if (xiaohongshuLoginPopupTextLooksLike(compactText(current)) && xiaohongshuLoginBoxLooksRemovable(current)) {
        best = current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return best;
  }

  function closestXiaohongshuLoginShell(element) {
    try {
      const container = element.closest([
        '[role="dialog"]',
        '[aria-modal="true"]',
        '[class*="login"]',
        '[class*="Login"]',
        '[class*="modal"]',
        '[class*="Modal"]',
        '[class*="dialog"]',
        '[class*="Dialog"]',
      ].join(','));
      if (!(container instanceof HTMLElement)) return null;
      if (xiaohongshuLoginPopupTextLooksLike(compactText(container)) && xiaohongshuLoginBoxLooksRemovable(container)) return container;
    } catch (_) {
      // Ignore selector support differences.
    }

    return null;
  }

  function xiaohongshuLoginPopupTextLooksLike(text) {
    const strongSignal = /登录后推荐更懂你的笔记|手机号登录|输入手机号|输入验证码|获取验证码|小红书扫码|新用户可直接登录|用户协议|隐私政策/i.test(text);
    const pairedSignal = /小红书/.test(text) && /扫码|手机号|验证码|登录/.test(text);
    return strongSignal || pairedSignal;
  }

  function xiaohongshuLoginBoxLooksRemovable(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 220 || box.height < 160) return false;
    if (box.width > window.innerWidth * 0.92 || box.height > window.innerHeight * 0.92) return false;

    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedLogin = /(login|modal|dialog|mask|overlay|auth|sign.?in)/i.test(identity);
    const style = getComputedStyle(element);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) > 0;

    return namedLogin || floating || xiaohongshuCenteredLoginPanel(element);
  }

  function xiaohongshuCenteredLoginPanel(element) {
    const box = element.getBoundingClientRect();
    if (box.width < 360 || box.width > 920 || box.height < 240 || box.height > window.innerHeight * 0.9) return false;

    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;
    const nearCenterX = Math.abs(centerX - window.innerWidth / 2) < window.innerWidth * 0.28;
    const nearCenterY = Math.abs(centerY - window.innerHeight / 2) < window.innerHeight * 0.32;

    return nearCenterX && nearCenterY;
  }

  function cleanupXiaohongshuLoginArtifacts(force) {
    let removedArtifact = false;

    selectAll(document, [
      '[class*="mask"]',
      '[class*="Mask"]',
      '[class*="overlay"]',
      '[class*="Overlay"]',
      '[class*="modal"]',
      '[class*="Modal"]',
      '[style*="position: fixed"]',
      '[style*="position:fixed"]',
      'body > div',
    ]).forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK) || !element.isConnected) return;

      if (force && xiaohongshuBackdropLooksLikeLoginMask(element)) {
        removeElement(element);
        removedArtifact = true;
      }
    });

    if (force || removedArtifact) unlockXiaohongshuPage();
  }

  function xiaohongshuBackdropLooksLikeLoginMask(element) {
    if (xiaohongshuPageRoot(element)) return false;

    const box = element.getBoundingClientRect();
    const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
    const area = box.width * box.height;
    if (area < viewportArea * 0.45) return false;

    const style = getComputedStyle(element);
    const identity = `${element.id || ''} ${element.className || ''}`;
    const namedMask = /(mask|overlay|modal|dialog|login|auth)/i.test(identity);
    const darkBackground = /rgba?\(\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)\s*,\s*(?:0|[1-9]\d?)(?:\s*,\s*(?:0\.[2-9]|1(?:\.0)?))?\s*\)/i.test(style.backgroundColor);
    const floating = /^(fixed|absolute|sticky)$/.test(style.position) || parseZIndex(style.zIndex) >= 10;

    return floating && (namedMask || darkBackground);
  }

  function unlockXiaohongshuPage() {
    [document.documentElement, document.body].forEach((element) => {
      if (!element) return;
      element.style.removeProperty('overflow');
      element.style.removeProperty('position');
      element.style.removeProperty('padding-right');
      element.classList.remove('modal-open', 'overflow-hidden', 'no-scroll', 'lock-scroll');
    });
  }

  function xiaohongshuPageRoot(element) {
    try {
      return element.matches('html, body, #app, #root, #__next, main');
    } catch (_) {
      return false;
    }
  }

  function cleanupBilibiliFamily(root) {
    if (!isBilibiliHost) return;

    const promotedCards = selectAll(root, [
      '.bili-video-card',
      '.bili-live-card',
      '.video-card',
      '.feed-card',
      '.floor-single-card',
      '.video-page-card-small',
      '.video-page-operator-card-small',
      '.video-page-special-card-small',
      '.banner-card',
      '.ad-report',
    ]);

    promotedCards.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK)) return;
      if (bilibiliCardLooksPromoted(element)) hideElement(element);
    });

    const topComments = selectAll(root, [
      '.reply-item',
      '.root-reply',
      '.comment-item',
    ]);

    topComments.forEach((element) => {
      if (!(element instanceof HTMLElement) || element.hasAttribute(MARK)) return;
      if (bilibiliTopCommentLooksSponsored(element)) hideElement(element);
    });
  }

  function bilibiliCardLooksPromoted(element) {
    const identity = `${element.id || ''} ${element.className || ''} ${element.getAttribute('data-card-type') || ''}`;
    if (/(^|[-_\s])(ad|ads|advert|sponsor|promo|creative-ad|commercial)([-_\s]|$)/i.test(identity)) {
      return true;
    }

    const strongMarker = element.querySelector([
      '.ad-report',
      '.ad-floor-card',
      '.ad-floor-cover',
      '.ad-floor-exp',
      '.bili-video-card__info--ad',
      '.bili-video-card__info--creative-ad',
      '.bili-video-card__stats--ad',
      '.bili-live-card__info--ad',
      '.video-card-ad-small',
      '[data-ad]',
      '[data-is-ad]',
      '[data-ad-report]',
      '[class*="creative-ad"]',
      '[class*="ad-floor"]',
    ].join(','));

    if (strongMarker) return true;
    return hasShortBilibiliAdLabel(element);
  }

  function hasShortBilibiliAdLabel(element) {
    const labelNodes = element.querySelectorAll('span, em, i, b, div');
    const limit = Math.min(labelNodes.length, 70);

    for (let index = 0; index < limit; index += 1) {
      const text = compactText(labelNodes[index]);
      if (/^(广告|推广|赞助|商业推广|创意推广|UP主推荐)$/.test(text)) {
        return true;
      }
    }

    return false;
  }

  function bilibiliTopCommentLooksSponsored(element) {
    const text = compactText(element);
    if (!/(置顶|UP主|up主|作者)/.test(text)) return false;

    const promoIntent = /(广告|推广|赞助|商单|恰饭|合作|品牌合作|购买|下单|带货|优惠码|优惠券|口令|链接|店铺|小黄车|橱窗)/.test(text);
    const conversionSignal = /(https?:\/\/|tb\.cn|m\.tb|jd\.com|pdd|taobao|tmall|复制|搜索|扫码|二维码|私信|微信|vx|VX|口令)/i.test(text);

    return promoIntent && conversionSignal;
  }

  function restoreVideoPlayerControls() {
    if (/(^|\.)youku\.com$/.test(hostname)) {
      document.querySelectorAll('.advertise-layer').forEach((element) => {
        element.textContent = '';
        hideElement(element);
      });

      document.querySelectorAll('.kui-dashboard-0, .kui-controlbar, .kui-play-icon-0').forEach((element) => {
        if (element instanceof HTMLElement) {
          element.style.setProperty('display', 'flex', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
          element.style.setProperty('pointer-events', 'auto', 'important');
        }
      });
    }
  }

  function closestAdBox(element) {
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < 4) {
      if (!(current instanceof HTMLElement)) break;

      const box = current.getBoundingClientRect();
      const classAndId = `${current.id} ${current.className || ''}`;
      const looksNamed = /(^|[-_\s])(ad|ads|advert|advertise|sponsor|promo|gg|tuiguang|guanggao)([-_\s]|$)/i.test(classAndId);
      const reasonableSize = box.width > 80 && box.height > 30;

      if (looksNamed && reasonableSize) return current;
      current = current.parentElement;
      depth += 1;
    }

    return null;
  }

  function selectAll(root, selectors) {
    if (!selectors.length) return [];

    const result = [];
    const selector = selectors.join(',');

    try {
      if (root.nodeType === Node.ELEMENT_NODE && root.matches(selector)) {
        result.push(root);
      }
    } catch (_) {
      // Bad selectors are ignored so one broken rule never disables the cleaner.
    }

    try {
      result.push(...root.querySelectorAll(selector));
    } catch (_) {
      selectors.forEach((singleSelector) => {
        try {
          result.push(...root.querySelectorAll(singleSelector));
        } catch (_) {
          // Ignore individual bad selectors.
        }
      });
    }

    return uniqueElements(result);
  }

  function hideElement(element) {
    if (!(element instanceof Element) || element.hasAttribute(MARK)) return;
    element.setAttribute(MARK, 'hidden');
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('pointer-events', 'none', 'important');
  }

  function removeElement(element) {
    if (!(element instanceof Element) || element.hasAttribute(MARK)) return;
    element.setAttribute(MARK, 'removed');
    element.remove();
  }

  function startObserver() {
    if (observer || !document.documentElement) return;

    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (isElementLikeRoot(node)) cleanup(node);
        });
      }
      scheduleCleanup();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function scheduleCleanup() {
    if (cleanupTimer) return;

    const run = () => {
      cleanupTimer = 0;
      cleanup(document);
    };

    if (typeof requestIdleCallback === 'function') {
      cleanupTimer = requestIdleCallback(run, { timeout: 800 });
    } else {
      cleanupTimer = setTimeout(run, 250);
    }
  }

  function whenDomReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function addStyle(cssText) {
    try {
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(cssText);
        return;
      }
    } catch (_) {
      // Fall through to a normal style tag.
    }

    const inject = () => {
      const style = document.createElement('style');
      style.textContent = cssText;
      (document.head || document.documentElement).appendChild(style);
    };

    if (document.documentElement) inject();
    else document.addEventListener('DOMContentLoaded', inject, { once: true });
  }

  function registerMenus() {
    if (typeof GM_registerMenuCommand !== 'function') return;

    const disabledHostsNow = storage.get(DISABLED_HOSTS_KEY, []);
    const disabledOnHost = disabledHostsNow.includes(hostname);
    const globalLabel = globallyEnabled ? '关闭全局去广告' : '开启全局去广告';
    const siteLabel = disabledOnHost ? `开启本站去广告：${hostname}` : `关闭本站去广告：${hostname}`;

    GM_registerMenuCommand(globalLabel, () => {
      storage.set(GLOBAL_ENABLED_KEY, !storage.get(GLOBAL_ENABLED_KEY, true));
      location.reload();
    });

    GM_registerMenuCommand(siteLabel, () => {
      const hosts = storage.get(DISABLED_HOSTS_KEY, []);
      const next = hosts.includes(hostname)
        ? hosts.filter((host) => host !== hostname)
        : unique(hosts.concat(hostname));
      storage.set(DISABLED_HOSTS_KEY, next);
      location.reload();
    });

    if (globallyEnabled && !disabledOnHost) {
      GM_registerMenuCommand('立即重新清理广告', () => cleanup(document));
    }
  }

  function isElementLikeRoot(node) {
    return node && (node.nodeType === Node.DOCUMENT_NODE || node.nodeType === Node.ELEMENT_NODE);
  }

  function unique(items) {
    return Array.from(new Set(items.filter(Boolean)));
  }

  function uniqueElements(elements) {
    return Array.from(new Set(elements.filter(Boolean)));
  }

  function compactText(element) {
    return (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }

  function parseZIndex(value) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
})();
