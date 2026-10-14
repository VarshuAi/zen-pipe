/**
 * ZenTube Multi-Platform Frontend Application
 * Handles YouTube, SoundCloud, Bandcamp, Transcripts, Shorts, and Subtitle Downloads
 */

class ZenTubeApp {
  constructor() {
    this.currentStream = null;
    this.currentFilter = 'all';
    this.isAudioOnly = false;

    // DOM Elements
    this.mainVideo = document.getElementById('mainVideo');
    this.mainAudio = document.getElementById('mainAudio');
    this.qualitySelect = document.getElementById('qualitySelect');
    this.audioSelect = document.getElementById('audioSelect');
    this.audioOnlyBtn = document.getElementById('audioOnlyBtn');
    this.downloadSrtBtn = document.getElementById('downloadSrtBtn');
    this.downloadVttBtn = document.getElementById('downloadVttBtn');
    this.sponsorBlockToggleBtn = document.getElementById('sponsorBlockToggleBtn');
    this.sponsorBlockEnabled = true;
    this.currentSponsorSegments = [];
    this.searchInput = document.getElementById('searchInput');
    this.searchBtn = document.getElementById('searchBtn');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.suggestionsBox = document.getElementById('suggestionsBox');
    this.loader = document.getElementById('loader');
    this.loaderText = document.getElementById('loaderText');
    this.errorBanner = document.getElementById('errorBanner');
    this.errorMessage = document.getElementById('errorMessage');

    // View Sections
    this.resultsSection = document.getElementById('resultsSection');
    this.watchSection = document.getElementById('watchSection');
    this.channelSection = document.getElementById('channelSection');
    this.playlistSection = document.getElementById('playlistSection');
    this.subscriptionsSection = document.getElementById('subscriptionsSection');
    this.feedSection = document.getElementById('feedSection');
    this.librarySection = document.getElementById('librarySection');
    this.trendingSection = document.getElementById('trendingSection');
    this.customPlaylistsSection = document.getElementById('customPlaylistsSection');
    this.trendingGrid = document.getElementById('trendingGrid');
    this.customPlaylistsGrid = document.getElementById('customPlaylistsGrid');
    this.singlePlaylistDetail = document.getElementById('singlePlaylistDetail');
    this.singlePlaylistTracks = document.getElementById('singlePlaylistTracks');
    this.trendingRegionSelect = document.getElementById('trendingRegionSelect');

    // Trending & Feed State
    this.currentTrendingCategory = 'all';
    this.currentTrendingRegion = 'US';

    // Custom Playlists State (Zero-Cloud LocalStorage)
    this.customPlaylists = [];
    this.activePlaylistId = null;

    // A-B Looper & Playback Controls State
    this.loopA = 0;
    this.loopB = 0;
    this.isLooping = false;
    this.playbackSpeedSelect = document.getElementById('playbackSpeedSelect');

    // Modals
    this.newPlaylistModal = document.getElementById('newPlaylistModal');
    this.addToPlaylistModal = document.getElementById('addToPlaylistModal');
    this.shortcutsModal = document.getElementById('shortcutsModal');

    // History & Bookmarks State (Zero-Cloud LocalStorage)
    this.resumePrompt = document.getElementById('resumePrompt');
    this.bookmarkBtn = document.getElementById('bookmarkBtn');
    this.currentLibraryMode = 'history';
    this._pendingResumeSeconds = 0;
    this._lastHistorySave = 0;
    this.history = [];
    this.bookmarks = [];

    // Queue & Mini-Player State
    this.queue = [];
    this.queueIndex = -1;
    this.autoplayNext = true;
    this.miniPlayer = document.getElementById('miniPlayer');
    this.queueDrawer = document.getElementById('queueDrawer');

    // HLS Live Stream Player State
    this.hlsInstance = null;
    this.liveBadge = document.getElementById('liveBadge');

    // Downloader & Fallback Mirror State
    this.downloadModal = document.getElementById('downloadModal');
    this.downloadModalTitle = document.getElementById('downloadModalTitle');
    this.downloadStatus = document.getElementById('downloadStatus');
    this.downloadStatusText = document.getElementById('downloadStatusText');
    this.mirrorsModal = document.getElementById('mirrorsModal');
    this.mirrorStatusText = document.getElementById('mirrorStatusText');
    this.mirrorsSummaryText = document.getElementById('mirrorsSummaryText');
    this.mirrorsTableBody = document.getElementById('mirrorsTableBody');

    this.subscriptions = [
      { serviceId: 0, serviceName: 'youtube', url: 'https://www.youtube.com/channel/UC_aEa8K-EOJ3D6gOs7HcyNg', name: 'NoCopyrightSounds' },
      { serviceId: 2, serviceName: 'peertube', url: 'https://peertube.tv/video-channels/framasoft', name: 'Framasoft' },
    ];

    // Flagship Features State: Ambient Light, Cinema Theater, Audio Saver
    this.isAmbientMode = localStorage.getItem('zenpipe_ambient_mode') !== 'false';
    this.ambientCanvas = document.getElementById('ambientCanvas');
    this.ambientCtx = this.ambientCanvas ? this.ambientCanvas.getContext('2d') : null;
    this.ambientTimer = null;
    this.isTheaterMode = false;
    this.isAudioOnlyMode = false;

    const ambientBtn = document.getElementById('ambientToggleBtn');
    if (ambientBtn) ambientBtn.classList.toggle('active', this.isAmbientMode);
    const glow = document.getElementById('playerAmbientGlow');
    if (glow && !this.isAmbientMode) glow.classList.add('disabled');

    this.loadLocalData();
    this.initEventListeners();
    this.initPlayerSync();
    this.initKeyboardShortcuts();
    this.checkMirrors();

    // Initial search
    this.loadHomeFeed();
  }

  initEventListeners() {
    // Search input
    let debounceTimer;
    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      this.clearSearchBtn.style.display = q ? 'block' : 'none';

      clearTimeout(debounceTimer);
      if (q.length >= 2 && !q.startsWith('http')) {
        debounceTimer = setTimeout(() => this.fetchSuggestions(q), 250);
      } else {
        this.suggestionsBox.style.display = 'none';
      }
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.suggestionsBox.style.display = 'none';
        this.triggerSearch();
      }
    });

    this.searchBtn.addEventListener('click', () => {
      this.suggestionsBox.style.display = 'none';
      this.triggerSearch();
    });

    this.clearSearchBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.clearSearchBtn.style.display = 'none';
      this.suggestionsBox.style.display = 'none';
      this.searchInput.focus();
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.yt-masthead-center') && !e.target.closest('.search-command-container') && !e.target.closest('.search-container')) {
        this.suggestionsBox.style.display = 'none';
      }
    });

    // Filters (Sidebar & Subheader Tabs)
    document.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-chip');
        if (!btn) return;

        const action = btn.dataset.action;
        const type = btn.dataset.type;
        const platform = btn.dataset.platform;

        // Synchronize active classes across all matching buttons
        document.querySelectorAll('.filter-chip').forEach((c) => {
          if (action && c.dataset.action === action) c.classList.add('active');
          else if (type && c.dataset.type === type) c.classList.add('active');
          else if (platform && c.dataset.platform === platform) c.classList.add('active');
          else c.classList.remove('active');
        });

        if (action === 'trending') {
          this.loadTrending();
          return;
        }

        if (action === 'feed') {
          this.loadSubscriptionsFeed();
          return;
        }

        if (action === 'playlists') {
          this.showPlaylists();
          return;
        }

        if (action === 'shorts') {
          this.loadShorts();
          return;
        }

        if (action === 'live') {
          this.loadLiveStreams();
          return;
        }

        if (action === 'history') {
          this.showHistory();
          return;
        }

        if (action === 'bookmarks') {
          this.showBookmarks();
          return;
        }

        if (action === 'subscriptions') {
          this.showSubscriptions();
          return;
        }

        if (platform === 'soundcloud') {
          const q = this.searchInput.value.trim() || 'Chillhop';
          this.searchSoundCloud(q);
          return;
        }

        if (platform === 'peertube') {
          const q = this.searchInput.value.trim() || 'Blender';
          this.searchPeerTube(q);
          return;
        }

        if (platform === 'mediaccc') {
          const q = this.searchInput.value.trim() || 'Python';
          this.searchMediaCCC(q);
          return;
        }

        this.currentFilter = type || 'all';
        const q = this.searchInput.value.trim() || 'NoCopyrightSounds';
        this.search(q, this.currentFilter);
      });
    });

    // Quality Select change
    this.qualitySelect.addEventListener('change', () => this.switchQuality());
    this.audioSelect.addEventListener('change', () => this.switchAudioTrack());

    // Audio Only mode toggle
    this.audioOnlyBtn.addEventListener('click', () => this.toggleAudioOnly());

    // Subtitle download buttons
    this.downloadSrtBtn.addEventListener('click', () => this.downloadSubtitles('srt'));
    this.downloadVttBtn.addEventListener('click', () => this.downloadSubtitles('vtt'));

    // SponsorBlock toggle button
    if (this.sponsorBlockToggleBtn) {
      this.sponsorBlockToggleBtn.addEventListener('click', () => {
        this.sponsorBlockEnabled = !this.sponsorBlockEnabled;
        this.sponsorBlockToggleBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> <span>SponsorBlock: ${this.sponsorBlockEnabled ? 'ON' : 'OFF'}</span>`;
        this.sponsorBlockToggleBtn.style.opacity = this.sponsorBlockEnabled ? '1' : '0.5';
        this.showSponsorToast(this.sponsorBlockEnabled ? 'SponsorBlock Enabled' : 'SponsorBlock Disabled');
      });
    }

    // Description toggle
    document.getElementById('descToggleBtn').addEventListener('click', () => {
      const desc = document.getElementById('descriptionText');
      const btn = document.getElementById('descToggleBtn');
      desc.classList.toggle('expanded');
      btn.innerText = desc.classList.contains('expanded') ? 'Show Less' : 'Show More';
    });
  }

  initPlayerSync() {
    const v = this.mainVideo;
    const a = this.mainAudio;

    let lastSkippedUuid = null;
    v.addEventListener('timeupdate', () => {
      if (!this.sponsorBlockEnabled || !this.currentSponsorSegments || this.currentSponsorSegments.length === 0) return;
      const t = v.currentTime;
      for (const seg of this.currentSponsorSegments) {
        if (t >= seg.startTime && t < seg.endTime - 0.25) {
          if (lastSkippedUuid !== seg.uuid) {
            lastSkippedUuid = seg.uuid;
            v.currentTime = seg.endTime;
            if (a.src) a.currentTime = seg.endTime;
            this.showSponsorToast(`Skipped ${seg.category.toUpperCase()} (${Math.round(seg.duration)}s)`);
          }
          break;
        }
      }

      // A-B Repeat Looper enforcement
      if (this.isLooping && this.loopB > this.loopA && v.currentTime >= this.loopB) {
        v.currentTime = this.loopA;
        if (a && a.src) a.currentTime = this.loopA;
      }

      // Record watch history progress periodically
      const now = Date.now();
      if (now - this._lastHistorySave > 3500) {
        this._lastHistorySave = now;
        this.recordHistoryProgress();
      }
    });

    v.addEventListener('waiting', () => {
      const overlay = document.getElementById('playerOverlay');
      if (overlay) overlay.style.display = 'flex';
    });
    v.addEventListener('play', () => {
      if (a.src && a.paused) a.play().catch(() => {});
    });
    v.addEventListener('playing', () => {
      const overlay = document.getElementById('playerOverlay');
      if (overlay) overlay.style.display = 'none';
      if (a.src && a.paused) a.play().catch(() => {});
      this.ensureAudioContextRunning();
      const miniPlay = document.getElementById('miniPlayBtn');
      if (miniPlay) miniPlay.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      this.startAmbientSampler();
    });
    v.addEventListener('canplay', () => {
      const overlay = document.getElementById('playerOverlay');
      if (overlay) overlay.style.display = 'none';
    });
    v.addEventListener('pause', () => {
      if (a.src) a.pause();
      const miniPlay = document.getElementById('miniPlayBtn');
      if (miniPlay) miniPlay.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
      this.recordHistoryProgress();
      this.stopAmbientSampler();
    });
    v.addEventListener('ended', () => {
      this.recordHistoryProgress(true);
      this.stopAmbientSampler();
      this.onTrackEnded();
    });
    v.addEventListener('seeking', () => { if (a.src) a.currentTime = v.currentTime; });
    v.addEventListener('seeked', () => { if (a.src) a.currentTime = v.currentTime; });
    v.addEventListener('ratechange', () => { if (a.src) a.playbackRate = v.playbackRate; });
    v.addEventListener('volumechange', () => {
      if (a.src) {
        a.volume = v.volume;
        a.muted = v.muted;
      }
    });

    // Drift correction
    v.addEventListener('timeupdate', () => {
      if (!a.src || a.paused) return;
      const drift = Math.abs(v.currentTime - a.currentTime);
      if (drift > 0.15) {
        a.currentTime = v.currentTime;
      }
    });
  }

  showLoader(text = 'Loading live data...') {
    this.loaderText.innerText = text;
    this.loader.style.display = 'flex';
  }

  hideLoader() {
    this.loader.style.display = 'none';
  }

  showError(msg) {
    this.errorMessage.innerText = msg;
    this.errorBanner.style.display = 'flex';
    setTimeout(() => { this.errorBanner.style.display = 'none'; }, 6000);
  }

  switchSection(sectionToShow) {
    const allSections = [
      this.resultsSection,
      this.watchSection,
      this.channelSection,
      this.playlistSection,
      this.subscriptionsSection,
      this.feedSection,
      this.librarySection,
      this.trendingSection,
      this.customPlaylistsSection,
    ];
    allSections.forEach((sec) => {
      if (sec) sec.style.display = 'none';
    });
    if (sectionToShow) sectionToShow.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Handle persistent mini-player
    if (sectionToShow !== this.watchSection && this.currentStream && (!this.mainVideo.paused || !this.mainAudio.paused || this.mainVideo.currentTime > 0)) {
      this.showMiniPlayer();
    } else {
      this.hideMiniPlayer();
    }
  }

  
  toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const viewport = document.getElementById('mainViewport');
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (viewport) viewport.classList.toggle('guide-collapsed');
  }

  
  toggleKaraoke() {
    this.isKaraoke = !this.isKaraoke;
    const btn = document.getElementById('karaokeBtn');
    if (btn) btn.classList.toggle('active', this.isKaraoke);
    const btnText = document.getElementById('karaokeBtnText');
    if (btnText) btnText.innerText = this.isKaraoke ? 'Karaoke: ON' : 'Karaoke';
    this.applyKaraokeDsp(this.isKaraoke);
  }

  applyKaraokeDsp(enabled) {
    try {
      if (!this.karaokeCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.karaokeCtx = new AudioCtx();
      }

      if (this.karaokeCtx.state === 'suspended') {
        this.karaokeCtx.resume().catch(() => {});
      }

      if (!this.karaokeSource) {
        this.karaokeSource = this.karaokeCtx.createMediaElementSource(this.mainVideo);
        this.karaokeSplitter = this.karaokeCtx.createChannelSplitter(2);
        this.karaokeMerger = this.karaokeCtx.createChannelMerger(2);
        this.karaokeInverter = this.karaokeCtx.createGain();
        this.karaokeInverter.gain.value = -1; // Invert phase: L - R cancels center vocals

        this.karaokeNormalGain = this.karaokeCtx.createGain();
        this.karaokeNormalGain.gain.value = 1;

        this.karaokeSource.connect(this.karaokeNormalGain);
        this.karaokeNormalGain.connect(this.karaokeCtx.destination);
      }

      if (enabled) {
        this.karaokeNormalGain.disconnect();
        this.karaokeSource.connect(this.karaokeSplitter);

        this.karaokeSplitter.connect(this.karaokeMerger, 0, 0);
        this.karaokeSplitter.connect(this.karaokeMerger, 0, 1);

        this.karaokeSplitter.connect(this.karaokeInverter, 1);
        this.karaokeInverter.connect(this.karaokeMerger, 0, 0);
        this.karaokeInverter.connect(this.karaokeMerger, 0, 1);

        this.karaokeMerger.connect(this.karaokeCtx.destination);
      } else {
        try { this.karaokeMerger.disconnect(); } catch {}
        try { this.karaokeSplitter.disconnect(); } catch {}
        try { this.karaokeInverter.disconnect(); } catch {}
        this.karaokeSource.disconnect();
        this.karaokeSource.connect(this.karaokeNormalGain);
        this.karaokeNormalGain.connect(this.karaokeCtx.destination);
      }
    } catch (err) {
      console.warn('Karaoke DSP error:', err);
    }
  }

  toggleSubscribe() {
    const btn = document.getElementById('subscribeBtn');
    if (!btn || !this.currentStream) return;
    const uploader = this.currentStream.uploader;
    if (!uploader) return;

    if (btn.classList.contains('subscribed')) {
      btn.classList.remove('subscribed');
      btn.innerText = 'Subscribe';
      this.subscriptions = (this.subscriptions || []).filter(s => s.name !== uploader.name && (!uploader.id || !s.url?.includes(uploader.id)));
    } else {
      btn.classList.add('subscribed');
      btn.innerText = 'Subscribed';
      const exists = (this.subscriptions || []).some(s => s.name === uploader.name);
      if (!exists) {
        this.subscriptions.push({
          serviceId: 0,
          serviceName: 'youtube',
          name: uploader.name,
          url: uploader.id ? ('https://www.youtube.com/channel/' + uploader.id) : (this.currentStream.url || '')
        });
      }
    }
    try {
      localStorage.setItem('zentube_subscriptions', JSON.stringify(this.subscriptions));
    } catch {}
  }

  openVoiceSearchDemo() {
    this.showError('Voice search requires browser microphone permissions. Type your search in the bar.');
  }

  likeCurrentVideo() {
    const btn = document.getElementById('likeBtn');
    const disBtn = document.getElementById('dislikeBtn');
    if (!btn) return;
    btn.classList.toggle('active');
    if (disBtn) disBtn.classList.remove('active');
  }

  dislikeCurrentVideo() {
    const btn = document.getElementById('dislikeBtn');
    const likeBtn = document.getElementById('likeBtn');
    if (!btn) return;
    btn.classList.toggle('active');
    if (likeBtn) likeBtn.classList.remove('active');
  }

  renderVideoCardHtml(item) {
    const thumb = item.thumbnails?.[0]?.url || (item.thumbnails?.[1]?.url) || 'https://via.placeholder.com/320x180';
    const safeTitle = (item.title || '').replace(/'/g, "\'");
    const uploaderName = item.uploader?.name || item.uploaderName || item.artist || 'Creator';
    const safeAuthor = uploaderName.replace(/'/g, "\'");
    const isLive = item.durationText === 'LIVE' || (item.durationText && item.durationText.includes('LIVE')) || item.isLive;
    const avatarUrl = item.uploader?.avatarUrl || item.uploaderAvatar || 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
    const viewsText = item.viewCountText || (item.viewCount ? Number(item.viewCount).toLocaleString() + ' views' : '');
    const timeText = item.publishedTimeText || item.uploadedDate || '';

    return `
      <div class="video-card" onclick="app.loadVideo('${item.id}')">
        <div class="thumb-container">
          <img class="thumb-img" src="${thumb}" loading="lazy" alt="${this.escapeHtml(item.title || '')}">
          ${isLive ? '<span class="duration-badge live"><span class="live-dot-pulse"></span> LIVE</span>' : (item.durationText ? `<span class="duration-badge">${item.durationText}</span>` : '')}
          <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${item.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: '${isLive ? 'LIVE' : (item.durationText || '')}', platform: 'youtube' })">+ Queue</button>
        </div>
        <div class="card-details">
          <div class="card-avatar-col" onclick="event.stopPropagation(); ${channelClick}" title="${safeAuthor}">
            <img class="card-channel-avatar" src="${avatarUrl}" loading="lazy" alt="${safeAuthor}" onerror="this.src='https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj'">
          </div>
          <div class="card-text-col">
            <h3 class="card-title" title="${this.escapeHtml(item.title || '')}">${this.escapeHtml(item.title || '')}</h3>
            <div class="card-channel" onclick="event.stopPropagation(); ${channelClick}" title="${safeAuthor}">
              <span>${this.escapeHtml(uploaderName)}</span>
              ${item.uploader?.verified ? '<svg class="verified-check" viewBox="0 0 24 24" width="14" height="14" fill="#aaa"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zM9.8 17.3l-4.2-4.1 1.4-1.4 2.8 2.7 7.4-7.4 1.4 1.4-8.8 8.8z"/></svg>' : ''}
            </div>
            <div class="card-meta">
              <span>${viewsText}</span>
              ${timeText ? `<span class="meta-dot">�</span><span>${timeText}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  
  async loadHomeFeed() {
    this.showLoader('Loading YouTube trending feed...');
    try {
      const res = await fetch('/api/trending?category=all&region=' + (this.currentTrendingRegion || 'US'));
      const data = await res.json();
      this.hideLoader();
      if (data && data.items && data.items.length > 0) {
        const heading = document.getElementById('resultsHeading');
        if (heading) heading.innerText = 'Trending & Recommended';
        const grid = document.getElementById('resultsGrid');
        if (grid) {
          grid.innerHTML = data.items.map((item) => this.renderVideoCardHtml(item)).join('');
        }
        this.switchSection(this.resultsSection);
      } else {
        this.search('trending music gaming news', 'all');
      }
    } catch {
      this.hideLoader();
      this.search('trending music gaming news', 'all');
    }
  }

  showHome() {
    document.querySelectorAll('.filter-chip').forEach((c) => {
      if (c.dataset.type === 'all') c.classList.add('active');
      else c.classList.remove('active');
    });
    this.loadHomeFeed();
  }

  async fetchSuggestions(query) {
    try {
      const res = await fetch(`/api/suggest?q=${encodeURIComponent(query)}`);
      const suggestions = await res.json();
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        this.suggestionsBox.style.display = 'none';
        return;
      }

      this.suggestionsBox.innerHTML = suggestions
        .map((s) => `
          <div class="suggestion-item" onclick="app.selectSuggestion('${s.replace(/'/g, "\\'")}')">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span>${s}</span>
          </div>
        `)
        .join('');
      this.suggestionsBox.style.display = 'block';
    } catch {
      this.suggestionsBox.style.display = 'none';
    }
  }

  selectSuggestion(text) {
    this.searchInput.value = text;
    this.suggestionsBox.style.display = 'none';
    this.triggerSearch();
  }

  triggerSearch() {
    const raw = this.searchInput.value.trim();
    if (!raw) return;

    // Direct Universal Router for any supported URL (SoundCloud, Bandcamp, YouTube)
    if (raw.startsWith('http')) {
      this.loadUniversalUrl(raw);
      return;
    }

    if (raw.startsWith('@')) {
      this.loadChannel(raw);
      return;
    }

    this.search(raw, this.currentFilter);
  }

  async loadUniversalUrl(url) {
    this.showLoader(`Extracting ${url}...`);
    try {
      const res = await fetch(`/api/universal?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      this.hideLoader();

      if (data.error && !data.embedUrl) {
        this.showError(data.error);
        return;
      }

      this.currentStream = data;
      this.renderWatchView(data);
      this.setupMediaSession(data);
      this.syncQueueCurrentTrack(data);
      this.updateMiniPlayer();
      this.switchSection(this.watchSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Extraction error: ' + err.message);
    }
  }

  async search(query, type = 'all') {
    this.showLoader(`Searching "${query}" via InnerTube...`);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${type}`);
      const data = await res.json();
      this.hideLoader();

      if (data.error) {
        this.showError(data.error);
        return;
      }

      this.renderSearchResults(data);
      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Search request failed: ' + err.message);
    }
  }

  async searchSoundCloud(query) {
    this.showLoader(`Searching SoundCloud for "${query}"...`);
    try {
      const res = await fetch(`/api/sc-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      this.hideLoader();

      const heading = document.getElementById('resultsHeading');
      heading.innerText = `SoundCloud Results for "${query}" (${data.items.length} tracks)`;

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = data.items
        .map((t) => `
          <div class="video-card" onclick="app.loadUniversalUrl('${t.streamUrl}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${t.thumbnails?.[0]?.url || 'https://via.placeholder.com/320'}" loading="lazy" alt="${t.title}">
              <span class="duration-badge" style="background: #ff5500;">${t.durationText || 'TRACK'}</span>
            </div>
            <div class="card-details">
              <span class="badge" style="background: rgba(255,85,0,0.15); color: #ff5500; border-color: #ff5500; width: max-content;">SOUNDCLOUD</span>
              <h3 class="card-title">${t.title}</h3>
              <div class="card-channel">${t.artist}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('SoundCloud search failed: ' + err.message);
    }
  }

  async loadShorts() {
    this.showLoader('Extracting YouTube Shorts reel...');
    try {
      const res = await fetch('/api/shorts');
      const data = await res.json();
      this.hideLoader();

      const heading = document.getElementById('resultsHeading');
      heading.innerText = `YouTube Shorts Reel (${data.items.length} items)`;

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = data.items
        .map((s) => `
          <div class="video-card" onclick="app.loadVideo('${s.id}')">
            <div class="thumb-container" style="padding-top: 130%;">
              <img class="thumb-img" src="${s.thumbnailUrl || ''}" loading="lazy" alt="${s.title}">
              <span class="duration-badge" style="background: #ef4444;">SHORTS</span>
            </div>
            <div class="card-details">
              <h3 class="card-title">${s.title}</h3>
              <div class="card-channel">${s.channelName}</div>
              <div class="card-meta">${s.viewCountText || ''}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Shorts load failed: ' + err.message);
    }
  }

  async loadLiveStreams() {
    this.showLoader('Scanning 24/7 Live Broadcasts...');
    try {
      const res = await fetch('/api/search?q=live+news+stream+24%2F7&type=video');
      const data = await res.json();
      this.hideLoader();

      const heading = document.getElementById('resultsHeading');
      heading.innerText = `Active Live Broadcasts (${data.items.length} streams)`;

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = data.items
        .map((item) => {
          const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/320x180';
          const safeTitle = (item.title || '').replace(/'/g, "\\'");
          const safeAuthor = (item.uploader?.name || '').replace(/'/g, "\\'");
          return `
            <div class="video-card" onclick="app.loadVideo('${item.id}')">
              <div class="thumb-container">
                <img class="thumb-img" src="${thumb}" loading="lazy" alt="${item.title}">
                <span class="duration-badge live"><span class="live-dot-pulse"></span> LIVE</span>
                <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${item.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: 'LIVE', platform: 'youtube' })">+ Queue</button>
              </div>
              <div class="card-details">
                <span class="badge" style="background: rgba(255,51,85,0.15); color: #ff3355; border-color: #ff3355; width: max-content; margin-bottom: 4px;">LIVE STREAM</span>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-channel">${item.uploader?.name || 'Live Channel'}</div>
                <div class="card-meta">${item.viewCountText || 'Watching now'}</div>
              </div>
            </div>
          `;
        })
        .join('');

      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Live streams load failed: ' + err.message);
    }
  }

  renderSearchResults(data) {
    const heading = document.getElementById('resultsHeading');
    heading.innerText = `Results for "${data.query}" (${data.items.length} items)`;

    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = data.items
      .map((item) => {
        if (item.type === 'video') {
          return this.renderVideoCardHtml(item);
        }

        if (item.type === 'channel') {
          const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/100';
          return `
            <div class="video-card" onclick="app.loadChannel('${item.id}')" style="align-items: center; text-align: center; padding: 20px;">
              <img src="${thumb}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-focus);" alt="${item.name}">
              <div class="card-details" style="align-items: center;">
                <span class="badge" style="margin-bottom: 6px;">CHANNEL</span>
                <h3 class="card-title">${item.name}</h3>
                <div class="card-meta">${item.subscriberCountText || ''}</div>
              </div>
            </div>
          `;
        }

        if (item.type === 'playlist') {
          const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/320x180';
          return `
            <div class="video-card" onclick="app.loadPlaylist('${item.id}')">
              <div class="thumb-container">
                <img class="thumb-img" src="${thumb}" loading="lazy" alt="${item.title}">
                <span class="duration-badge" style="background: var(--accent-purple);">${item.videoCountText || 'PLAYLIST'}</span>
              </div>
              <div class="card-details">
                <span class="badge" style="margin-bottom: 4px; width: max-content;">PLAYLIST</span>
                <h3 class="card-title">${item.title}</h3>
                <div class="card-channel">${item.uploaderName || ''}</div>
              </div>
            </div>
          `;
        }
        return '';
      })
      .join('');
  }

  async loadVideo(videoId) {
    this.showLoader(`Extracting video ${videoId}...`);
    try {
      const res = await fetch(`/api/stream?id=${encodeURIComponent(videoId)}`);
      const stream = await res.json();
      this.hideLoader();

      if (stream.error && !stream.embedUrl) {
        this.showError(stream.error);
        return;
      }

      this.currentStream = stream;
      this.renderWatchView(stream);
      this.setupMediaSession(stream);
      this.syncQueueCurrentTrack(stream);
      this.updateMiniPlayer();
      this.switchSection(this.watchSection);

      // Load comments, transcript, recommendations, dislikes & sponsors in parallel
      this.loadComments(videoId);
      this.loadTranscript(videoId);
      this.loadRelated(videoId);
      this.loadDislikes(videoId);
      this.loadSponsorBlock(videoId);
    } catch (err) {
      this.hideLoader();
      this.showError('Video extraction failed: ' + err.message);
    }
  }

  renderWatchView(stream) {
    // Platform Tag
    const tag = document.getElementById('platformTag');
    tag.innerText = (stream.platform || 'YOUTUBE').toUpperCase();
    tag.className = `platform-tag ${stream.platform || 'youtube'}`;

    // Meta
    document.getElementById('videoTitle').innerText = stream.title;
    document.getElementById('channelName').innerText = stream.uploader.name;
    document.getElementById('channelAvatar').src = stream.uploader.avatarUrl || 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';
    const subBtn = document.getElementById('subscribeBtn');
    if (subBtn) {
      const isSubbed = (this.subscriptions || []).some(s => s.name === stream.uploader.name || (stream.uploader.id && (s.url?.includes(stream.uploader.id) || s.channelId === stream.uploader.id)));
      if (isSubbed) {
        subBtn.classList.add('subscribed');
        subBtn.innerText = 'Subscribed';
      } else {
        subBtn.classList.remove('subscribed');
        subBtn.innerText = 'Subscribe';
      }
    }

    // Live Stream Detection
    if (stream.isLive) {
      if (this.liveBadge) this.liveBadge.style.display = 'inline-flex';
      document.getElementById('videoDuration').innerText = 'LIVE';
      document.getElementById('videoViews').innerText = `${stream.viewCount.toLocaleString()} watching now`;
    } else {
      if (this.liveBadge) this.liveBadge.style.display = 'none';
      document.getElementById('videoDuration').innerText = `${stream.duration}s`;
      document.getElementById('videoViews').innerText = `${stream.viewCount.toLocaleString()} plays/views`;
    }
    const descBox = document.getElementById('descriptionText');
    const descBtn = document.getElementById('descToggleBtn');
    descBox.innerText = stream.description || 'No description available.';
    descBox.classList.remove('expanded');
    if (descBtn) {
      descBtn.innerText = '...more';
      descBtn.onclick = (e) => {
        e.stopPropagation();
        if (descBox.classList.contains('expanded')) {
          descBox.classList.remove('expanded');
          descBtn.innerText = '...more';
        } else {
          descBox.classList.add('expanded');
          descBtn.innerText = 'Show less';
        }
      };
    }

    // Channel link click
    document.getElementById('uploaderContainer').onclick = () => {
      if (stream.uploader.id && stream.platform === 'youtube') {
        this.loadChannel(stream.uploader.id);
      }
    };

    // Subtitle Download Buttons
    if (stream.subtitles && stream.subtitles.length > 0) {
      this.downloadSrtBtn.style.display = 'inline-block';
      this.downloadVttBtn.style.display = 'inline-block';
    } else {
      this.downloadSrtBtn.style.display = 'none';
      this.downloadVttBtn.style.display = 'none';
    }

    // Video streams (with HLS for live streams)
    const qualityWrap = document.getElementById('qualityWrap');
    const qualityOptions = (stream.videoStreams || []).map(
      (v, i) => `<option value="${i}">${v.resolution} (${v.fps}fps, ${v.container.toUpperCase()}, ${Math.round(v.bitrate / 1000)} kbps)</option>`
    );
    if (stream.isLive && stream.hlsManifestUrl) {
      qualityOptions.unshift('<option value="hls" selected>Auto (Live HLS Stream)</option>');
    }

    if (qualityOptions.length > 0) {
      qualityWrap.style.display = 'flex';
      this.qualitySelect.innerHTML = qualityOptions.join('');
      if (stream.isLive && stream.hlsManifestUrl) {
        this.qualitySelect.value = 'hls';
      }
    } else {
      qualityWrap.style.display = 'none';
    }

    // Audio streams
    const audioWrap = document.getElementById('audioWrap');
    if (stream.audioStreams && stream.audioStreams.length > 0) {
      audioWrap.style.display = 'flex';
      this.audioSelect.innerHTML = stream.audioStreams
        .map((a, i) => `<option value="${i}">${a.container.toUpperCase()} • ${Math.round(a.bitrate / 1000)} kbps (${a.audioSampleRate}Hz)</option>`)
        .join('');
    } else {
      audioWrap.style.display = 'none';
    }

    // Chapters
    const chaptersContainer = document.getElementById('chaptersContainer');
    const chaptersList = document.getElementById('chaptersList');
    if (stream.chapters && stream.chapters.length > 0) {
      chaptersContainer.style.display = 'block';
      chaptersList.innerHTML = stream.chapters
        .map((c) => `<button class="chapter-pill" onclick="app.seekTo(${c.startTimeSeconds})">${this.formatSeconds(c.startTimeSeconds)} - ${c.title}</button>`)
        .join('');
    } else {
      chaptersContainer.style.display = 'none';
    }

    // Related
    const relatedList = document.getElementById('relatedList');
    relatedList.innerHTML = (stream.relatedVideos || [])
      .map((r) => {
        const thumb = r.thumbnails?.[0]?.url || 'https://via.placeholder.com/120x68';
        return `
          <div class="related-card" onclick="app.loadVideo('${r.id}')">
            <div class="related-thumb-box">
              <img class="related-thumb" src="${thumb}" loading="lazy" alt="${r.title}">
            </div>
            <div class="related-info">
              <div class="related-title">${r.title}</div>
              <div class="related-uploader">${r.uploaderName}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.setupMediaSources(true);
    this.checkResumePrompt(stream);
    this.updateBookmarkButton();
    this.recordHistoryProgress();

    if (this.isAudioOnlyMode) {
      const cover = document.getElementById('audioOnlyCover');
      const thumbImg = document.getElementById('audioOnlyThumb');
      if (cover) cover.style.display = 'flex';
      if (thumbImg) {
        thumbImg.src = stream.thumbnails?.[stream.thumbnails.length - 1]?.url || stream.thumbnails?.[0]?.url || '';
      }
    }
  }

  setupMediaSources(autoplay = true, preservePosition = false) {
    if (!this.currentStream) return;

    const stream = this.currentStream;

    // Destroy previous HLS instance if any
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    // Handle Datacenter Anti-Bot Failover Embed
    if (stream.datacenterChallenge && stream.embedUrl) {
      this.mainVideo.style.display = 'none';
      if (this.mainAudio.src) this.mainAudio.removeAttribute('src');

      let embed = document.getElementById('mainEmbed');
      if (!embed) {
        embed = document.createElement('iframe');
        embed.id = 'mainEmbed';
        embed.className = 'yt-embed-player';
        embed.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        embed.allowFullscreen = true;
        embed.style.width = '100%';
        embed.style.height = '100%';
        embed.style.border = 'none';
        embed.style.borderRadius = '12px';
        embed.style.minHeight = '480px';
        this.mainVideo.parentElement.appendChild(embed);
      }
      embed.style.display = 'block';
      embed.src = stream.embedUrl;
      return;
    } else {
      const embed = document.getElementById('mainEmbed');
      if (embed) {
        embed.style.display = 'none';
        embed.src = '';
      }
    }

    // Handle HLS Live Stream (Prioritize HLS for genuine live broadcast)
    const isHls = Boolean(stream.isLive && stream.hlsManifestUrl);
    if (isHls && stream.hlsManifestUrl) {
      const hlsUrl = `/api/proxy?url=${encodeURIComponent(stream.hlsManifestUrl)}`;
      this.mainVideo.style.display = 'block';
      if (this.mainAudio.src) this.mainAudio.removeAttribute('src');

      if (window.Hls && Hls.isSupported()) {
        this.hlsInstance = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 5,
          startLevel: -1,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000
        });
        this.hlsInstance.loadSource(hlsUrl);
        this.hlsInstance.attachMedia(this.mainVideo);
        this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoplay) {
            const p = this.mainVideo.play();
            if (p !== undefined) {
              p.catch((err) => {
                console.warn('Autoplay prevented, retrying muted for instant start:', err);
                this.mainVideo.muted = true;
                this.mainVideo.play().catch(() => {});
                this.showUnmuteBanner();
              });
            }
          }
        });
        this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('HLS Fatal error:', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Fatal network error, attempting HLS recovery...');
                this.hlsInstance.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Fatal media error, attempting HLS recovery...');
                this.hlsInstance.recoverMediaError();
                break;
              default:
                this.hlsInstance?.destroy();
                this.hlsInstance = null;
                if (stream.videoStreams && stream.videoStreams.length > 0) {
                  const fb = stream.videoStreams[0];
                  this.mainVideo.src = `/api/proxy?url=${encodeURIComponent(fb.url)}`;
                  if (autoplay) {
                    this.mainVideo.play().catch(() => {
                      this.mainVideo.muted = true;
                      this.mainVideo.play().catch(() => {});
                      this.showUnmuteBanner();
                    });
                  }
                }
                break;
            }
          }
        });
      } else if (this.mainVideo.canPlayType('application/vnd.apple.mpegurl')) {
        this.mainVideo.src = hlsUrl;
        if (autoplay) {
          const p = this.mainVideo.play();
          if (p !== undefined) {
            p.catch(() => {
              this.mainVideo.muted = true;
              this.mainVideo.play().catch(() => {});
              this.showUnmuteBanner();
            });
          }
        }
      }
      return;
    }

    // Regular video streams (VOD / Multi-platform)
    const vIdx = parseInt(this.qualitySelect.value, 10) || 0;
    const aIdx = parseInt(this.audioSelect.value, 10) || 0;

    const selectedVideo = stream.videoStreams?.[vIdx];
    const selectedAudio = stream.audioStreams?.[aIdx];

    const currentTime = preservePosition ? (this.mainVideo.currentTime || 0) : 0;
    const wasPlaying = !this.mainVideo.paused;

    if (selectedVideo && selectedVideo.url) {
      this.mainVideo.src = `/api/proxy?url=${encodeURIComponent(selectedVideo.url)}`;
      this.mainVideo.style.display = 'block';
    } else if (selectedAudio && selectedAudio.url) {
      // Audio-only track (SoundCloud or Bandcamp)
      this.mainVideo.src = `/api/proxy?url=${encodeURIComponent(selectedAudio.url)}`;
      this.mainVideo.style.display = 'block';
    }

    if (selectedAudio && selectedVideo && selectedVideo.type !== 'video_audio') {
      this.mainAudio.src = `/api/proxy?url=${encodeURIComponent(selectedAudio.url)}`;
      this.mainAudio.volume = this.mainVideo.volume;
      this.mainAudio.muted = this.mainVideo.muted;
      this.mainAudio.playbackRate = this.mainVideo.playbackRate;
    } else {
      this.mainAudio.removeAttribute('src');
    }

    if (preservePosition && currentTime > 0) {
      this.mainVideo.currentTime = currentTime;
      if (this.mainAudio.src) {
        this.mainAudio.currentTime = currentTime;
      }
    } else {
      this.mainVideo.currentTime = 0;
      if (this.mainAudio.src) {
        this.mainAudio.currentTime = 0;
      }
    }

    if (autoplay || wasPlaying) {
      const p = this.mainVideo.play();
      if (p !== undefined) {
        p.then(() => {
          if (this.mainAudio.src) {
            this.mainAudio.currentTime = this.mainVideo.currentTime;
            this.mainAudio.play().catch(() => {});
          }
        }).catch((err) => {
          console.warn('Autoplay unmuted was blocked by browser, falling back to muted autoplay:', err);
          this.mainVideo.muted = true;
          this.mainVideo.play().then(() => {
            if (this.mainAudio.src) {
              this.mainAudio.muted = true;
              this.mainAudio.play().catch(() => {});
            }
            this.showUnmuteBanner();
          }).catch(() => {});
        });
      }
    }
  }

  showUnmuteBanner() {
    const banner = document.getElementById('unmuteBanner');
    if (banner) banner.style.display = 'flex';
  }

  unmutePlayer() {
    this.mainVideo.muted = false;
    if (this.mainAudio.src) {
      this.mainAudio.muted = false;
      this.mainAudio.play().catch(() => {});
    }
    const banner = document.getElementById('unmuteBanner');
    if (banner) banner.style.display = 'none';
  }

  switchQuality() { this.setupMediaSources(true, true); }
  switchAudioTrack() { this.setupMediaSources(true, true); }

  toggleAudioOnly() {
    this.isAudioOnly = !this.isAudioOnly;
    this.audioOnlyBtn.innerHTML = this.isAudioOnly ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg><span>Video Mode</span>` : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg><span>Audio Only</span>`;
    this.mainVideo.style.opacity = this.isAudioOnly ? '0.08' : '1';
  }

  seekTo(seconds) {
    this.mainVideo.currentTime = seconds;
    if (this.mainAudio.src) this.mainAudio.currentTime = seconds;
    this.mainVideo.play().catch(() => {});
  }

  formatSeconds(sec) {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  }

  async loadTranscript(videoId) {
    const box = document.getElementById('transcriptBox');
    const cuesList = document.getElementById('transcriptCues');

    try {
      const res = await fetch(`/api/transcript?id=${encodeURIComponent(videoId)}`);
      const cues = await res.json();

      if (!Array.isArray(cues) || cues.length === 0) {
        box.style.display = 'none';
        return;
      }

      box.style.display = 'block';
      cuesList.innerHTML = cues
        .map((c) => `
          <div class="transcript-cue-row" onclick="app.seekTo(${Math.floor(c.startMs / 1000)})">
            <span class="cue-time">${c.timeFormatted}</span>
            <span class="cue-text">${c.text}</span>
          </div>
        `)
        .join('');
    } catch {
      box.style.display = 'none';
    }
  }

  async downloadSubtitles(format) {
    if (!this.currentStream) return;
    const url = `/api/subtitles?id=${encodeURIComponent(this.currentStream.id)}&format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.currentStream.title || 'subtitles'}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async loadComments(videoId) {
    const list = document.getElementById('commentsList');
    list.innerHTML = '<p style="color: var(--text-dim);">Fetching live comments...</p>';

    try {
      const res = await fetch(`/api/comments?id=${encodeURIComponent(videoId)}`);
      const data = await res.json();

      document.getElementById('commentsCount').innerText = data.comments.length;

      if (data.comments.length === 0) {
        list.innerHTML = '<p style="color: var(--text-dim);">No comments available.</p>';
        return;
      }

      list.innerHTML = data.comments
        .map((c) => `
          <div class="comment-item">
            <img class="comment-avatar" src="${c.authorAvatarUrl || 'https://via.placeholder.com/36'}" alt="${c.authorName}">
            <div class="comment-content-box">
              <div class="comment-author-bar">
                <span class="comment-author">${c.authorName}</span>
                <span class="comment-time">${c.publishedTimeText}</span>
              </div>
              <div class="comment-text">${c.content}</div>
              <div class="comment-likes"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> ${c.likeCountText || '0'}</div>
            </div>
          </div>
        `)
        .join('');
    } catch {
      list.innerHTML = '<p style="color: var(--text-dim);">Could not load comments.</p>';
    }
  }

    async loadDislikes(videoId) {
    const likesVal = document.getElementById('likesVal');
    const dislikesVal = document.getElementById('dislikesVal');
    const dislikeStats = document.getElementById('dislikeStats');
    const dislikeRatingBar = document.getElementById('dislikeRatingBar');

    try {
      const res = await fetch('/api/dislikes?id=' + encodeURIComponent(videoId));
      const data = await res.json();
      if (data && data.likes !== undefined) {
        if (likesVal) likesVal.innerText = Number(data.likes || 0).toLocaleString();
        if (dislikesVal) dislikesVal.innerText = Number(data.dislikes || 0).toLocaleString();
        if (dislikeStats && dislikeRatingBar) {
          dislikeStats.style.display = 'block';
          dislikeRatingBar.style.width = data.likePercentage + '%';
          dislikeStats.title = data.likePercentage + '% Likes (' + Number(data.likes).toLocaleString() + ') vs ' + data.dislikePercentage + '% Dislikes (' + Number(data.dislikes).toLocaleString() + ') � Rating: ' + data.rating + '/5.0';
        }
      }
    } catch {
      if (dislikeStats) dislikeStats.style.display = 'none';
    }
  }

  async loadSponsorBlock(videoId) {
    this.currentSponsorSegments = [];
    try {
      const res = await fetch(`/api/sponsorblock?id=${encodeURIComponent(videoId)}`);
      const segments = await res.json();
      if (Array.isArray(segments) && segments.length > 0) {
        this.currentSponsorSegments = segments;
        const totalDuration = segments.reduce((acc, s) => acc + s.duration, 0);
        this.showSponsorToast(`${segments.length} SponsorBlock segment${segments.length > 1 ? 's' : ''} detected (~${Math.round(totalDuration)}s)`);
      }
    } catch {}
  }

  showSponsorToast(message) {
    const toast = document.getElementById('sponsorToast');
    const text = document.getElementById('sponsorToastText');
    if (!toast || !text) return;

    text.innerText = message;
    toast.style.display = 'flex';
    toast.classList.add('visible');

    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3500);
  }

  async loadChannel(channelIdOrHandle) {
    this.showLoader(`Extracting channel ${channelIdOrHandle}...`);
    try {
      const res = await fetch(`/api/channel?id=${encodeURIComponent(channelIdOrHandle)}`);
      const ch = await res.json();
      this.hideLoader();

      if (ch.error) {
        this.showError(ch.error);
        return;
      }

      const chTitle = document.getElementById('channelTitle'); if (chTitle) chTitle.innerText = ch.name;
      
      const chSubs = document.getElementById('channelSubscribers'); if (chSubs) chSubs.innerText = ch.subscriberCountText || (ch.handle ? ch.handle : '');
      const chDesc = document.getElementById('channelDescription'); if (chDesc) chDesc.innerText = ch.description || '';
      const chAvatar = document.getElementById('channelAvatarHero'); if (chAvatar) chAvatar.src = ch.avatarUrl || 'https://yt3.ggpht.com/a/default-user=s88-c-k-c0x00ffffff-no-rj';

      const banner = document.getElementById('channelBanner');
      banner.style.backgroundImage = ch.bannerUrl ? `url('${ch.bannerUrl}')` : 'linear-gradient(135deg, #1e1e2f 0%, #0a0b0f 100%)';

      const tabsBox = document.getElementById('channelTabs');
      tabsBox.innerHTML = ch.tabs.map((t) => `<button class="filter-chip">${t}</button>`).join('');

      const uploadsGrid = document.getElementById('channelGrid');
      uploadsGrid.innerHTML = ch.recentVideos
        .map((v) => `
          <div class="video-card" onclick="app.loadVideo('${v.id}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${v.thumbnails?.[0]?.url || ''}" loading="lazy" alt="${v.title}">
              <span class="duration-badge">${v.durationText || ''}</span>
            </div>
            <div class="card-details">
              <h3 class="card-title">${v.title}</h3>
              <div class="card-meta">${v.viewCountText || ''}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.channelSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Channel load failed: ' + err.message);
    }
  }

  async loadPlaylist(playlistId) {
    this.showLoader(`Extracting playlist ${playlistId}...`);
    try {
      const res = await fetch(`/api/playlist?id=${encodeURIComponent(playlistId)}`);
      const p = await res.json();
      this.hideLoader();

      if (p.error) {
        this.showError(p.error);
        return;
      }

      this.currentPlaylist = p;
      document.getElementById('playlistTitle').innerText = p.title;
      document.getElementById('playlistUploader').innerText = `By ${p.uploaderName || 'Unknown'}`;
      document.getElementById('playlistCount').innerText = `${p.videoCount} Tracks`;
      document.getElementById('playlistThumb').src = p.thumbnails?.[0]?.url || 'https://via.placeholder.com/220x124';

      const tracksList = document.getElementById('playlistTracks') || document.getElementById('playlistTracksList');
      tracksList.innerHTML = p.videos
        .map((v, i) => {
          const safeTitle = (v.title || '').replace(/'/g, "\\'");
          const safeAuthor = (p.uploaderName || '').replace(/'/g, "\\'");
          return `
            <div class="playlist-track-row" onclick="app.loadVideo('${v.id}')">
              <span class="track-num">${i + 1}</span>
              <img class="track-thumb" src="${v.thumbnails?.[0]?.url || ''}" alt="">
              <span class="track-title">${v.title}</span>
              <button class="track-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${v.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: v.thumbnails, durationText: '${v.durationText || ''}', platform: 'youtube' })">+ Queue</button>
              <span class="track-duration">${v.durationText || ''}</span>
            </div>
          `;
        })
        .join('');

      this.switchSection(this.playlistSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Playlist load failed: ' + err.message);
    }
  }

  loadSoundCloudDemo() {
    this.loadUniversalUrl('https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-summer-2024');
  }

  loadBandcampDemo() {
    this.loadUniversalUrl('https://chillhop.bandcamp.com/album/chillhop-essentials-summer-2024');
  }

  // --- RELATED STREAMS ---
  async loadRelated(videoId) {
    try {
      const res = await fetch(`/api/related?id=${encodeURIComponent(videoId)}`);
      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0) return;

      const relatedList = document.getElementById('relatedList');
      relatedList.innerHTML = items
        .map((r) => {
          const thumb = r.thumbnails?.[0]?.url || 'https://via.placeholder.com/120x68';
          const safeTitle = (r.title || '').replace(/'/g, "\\'");
          const safeAuthor = (r.uploaderName || '').replace(/'/g, "\\'");
          return `
            <div class="related-card" onclick="app.loadVideo('${r.id}')">
              <div class="related-thumb-box" style="position: relative;">
                <img class="related-thumb" src="${thumb}" loading="lazy" alt="${r.title}">
                <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${r.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: '${r.duration || ''}', platform: 'youtube' })">+</button>
              </div>
              <div class="related-info">
                <div class="related-title">${r.title}</div>
                <div class="related-uploader">${r.uploaderName}</div>
                <div class="related-meta">${r.duration ? r.duration + ' • ' : ''}${r.viewCountText || ''}</div>
              </div>
            </div>
          `;
        })
        .join('');
    } catch {}
  }

  // --- PEERTUBE SERVICE METHODS ---
  loadPeerTubeDemo() {
    this.loadUniversalUrl('https://peertube.tv/w/52364');
  }

  async searchPeerTube(query) {
    this.showLoader(`Searching PeerTube for "${query}"...`);
    try {
      const res = await fetch(`/api/peertube-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      this.hideLoader();

      const heading = document.getElementById('resultsHeading');
      heading.innerText = `PeerTube Results for "${query}" (${data.items.length} videos)`;

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = data.items
        .map((v) => `
          <div class="video-card" onclick="app.loadUniversalUrl('https://peertube.tv/w/${v.id}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${v.thumbnails?.[0]?.url || 'https://via.placeholder.com/320'}" loading="lazy" alt="${v.title}">
              <span class="duration-badge" style="background: #f1680d;">${v.durationText || 'VIDEO'}</span>
            </div>
            <div class="card-details">
              <span class="badge" style="background: rgba(241,104,13,0.15); color: #f1680d; border-color: #f1680d; width: max-content;">PEERTUBE</span>
              <h3 class="card-title">${v.title}</h3>
              <div class="card-channel">${v.uploader.name}</div>
              <div class="card-meta">${v.viewCountText} • ${v.publishedTimeText}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('PeerTube search failed: ' + err.message);
    }
  }

  // --- MEDIACCC SERVICE METHODS ---
  loadMediaCCCDemo() {
    this.loadUniversalUrl('https://media.ccc.de/v/bob11-2026-swift-ui-chakravarty');
  }

  async searchMediaCCC(query) {
    this.showLoader(`Searching media.ccc.de for "${query}"...`);
    try {
      const res = await fetch(`/api/mediaccc-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      this.hideLoader();

      const heading = document.getElementById('resultsHeading');
      heading.innerText = `MediaCCC Results for "${query}" (${data.items.length} events)`;

      const grid = document.getElementById('resultsGrid');
      grid.innerHTML = data.items
        .map((e) => `
          <div class="video-card" onclick="app.loadUniversalUrl('https://media.ccc.de/v/${e.id}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${e.thumbnails?.[0]?.url || 'https://via.placeholder.com/320'}" loading="lazy" alt="${e.title}">
              <span class="duration-badge" style="background: #25835b;">${e.durationText || 'EVENT'}</span>
            </div>
            <div class="card-details">
              <span class="badge" style="background: rgba(37,131,91,0.15); color: #25835b; border-color: #25835b; width: max-content;">MEDIA.CCC.DE</span>
              <h3 class="card-title">${e.title}</h3>
              <div class="card-channel">${e.uploader.name}</div>
              <div class="card-meta">${e.viewCountText ? e.viewCountText + ' • ' : ''}${e.publishedTimeText}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.resultsSection);
    } catch (err) {
      this.hideLoader();
      this.showError('MediaCCC search failed: ' + err.message);
    }
  }

  // --- CHANNEL RSS FEED METHODS ---
  loadFeedDemo() {
    this.loadFeed('@NoCopyrightSounds');
  }

  async loadFeed(channelIdOrHandle) {
    this.showLoader(`Fetching live RSS feed for ${channelIdOrHandle}...`);
    try {
      const res = await fetch(`/api/feed?channel=${encodeURIComponent(channelIdOrHandle)}`);
      const feed = await res.json();
      this.hideLoader();

      if (feed.error) {
        this.showError(feed.error);
        return;
      }

      const fTitle = document.getElementById('feedHeading') || document.getElementById('feedTitle'); if (fTitle) fTitle.innerText = `${feed.title} (RSS Feed)`;
      document.getElementById('feedMeta').innerText = `${feed.items.length} Recent Uploads • Zero Rate-Limits`;

      const grid = document.getElementById('feedGrid');
      grid.innerHTML = feed.items
        .map((item) => `
          <div class="video-card" onclick="app.loadVideo('${item.id}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${item.thumbnailUrl || 'https://via.placeholder.com/320'}" loading="lazy" alt="${item.title}">
              <span class="duration-badge" style="background: #e62117;">FEED</span>
            </div>
            <div class="card-details">
              <span class="badge" style="background: rgba(230,33,23,0.15); color: #e62117; border-color: #e62117; width: max-content;">RSS ATOM</span>
              <h3 class="card-title">${item.title}</h3>
              <div class="card-channel">${item.channelTitle}</div>
              <div class="card-meta">${item.views ? item.views.toLocaleString() + ' views • ' : ''}${new Date(item.published).toLocaleDateString()}</div>
            </div>
          </div>
        `)
        .join('');

      this.switchSection(this.feedSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Feed fetch failed: ' + err.message);
    }
  }

  // --- SUBSCRIPTIONS & OPML METHODS ---
  showSubscriptions() {
    this.renderSubscriptions();
    this.switchSection(this.subscriptionsSection);
  }

  renderSubscriptions() {
    const grid = document.getElementById('subscriptionsGrid') || document.getElementById('subsGrid');
    grid.innerHTML = this.subscriptions
      .map((sub, i) => `
        <div class="video-card" onclick="app.loadFeed('${sub.url}')">
          <div class="thumb-container" style="display: flex; align-items: center; justify-content: center; background: #181920; font-size: 3rem;">
            <span class="service-badge">${sub.serviceName.toUpperCase()}</span>
          </div>
          <div class="card-details">
            <span class="badge" style="width: max-content;">${sub.serviceName.toUpperCase()}</span>
            <h3 class="card-title">${sub.name}</h3>
            <div class="card-channel">${sub.url}</div>
          </div>
        </div>
      `)
      .join('');
  }

  downloadOpml() {
    window.open('/api/subscriptions/opml', '_blank');
  }

  downloadNewPipeJson() {
    window.open('/api/subscriptions/newpipe', '_blank');
  }

  async importSubscriptions() {
    const raw = document.getElementById('importPayload').value.trim();
    if (!raw) return;

    const statusEl = document.getElementById('importStatus');
    statusEl.innerText = 'Importing...';

    try {
      const isXml = raw.startsWith('<');
      const endpoint = isXml ? '/api/subscriptions/opml' : '/api/subscriptions/newpipe';
      const res = await fetch(endpoint, {
        method: 'POST',
        body: raw,
      });

      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        this.subscriptions = items;
        this.renderSubscriptions();
        statusEl.innerText = `Imported ${items.length} subscriptions successfully!`;
        statusEl.style.color = '#00ffaa';
      } else {
        statusEl.innerText = 'No subscriptions found in import payload.';
        statusEl.style.color = '#ff4444';
      }
    } catch (err) {
      statusEl.innerText = 'Import failed: ' + err.message;
      statusEl.style.color = '#ff4444';
    }
  }

  // --- PERSISTENT FLOATING MINI-PLAYER & CONTINUOUS PLAYBACK QUEUE ---
  showMiniPlayer() {
    if (!this.miniPlayer || !this.currentStream) return;
    this.miniPlayer.style.display = 'flex';
    this.updateMiniPlayer();
  }

  hideMiniPlayer() {
    if (this.miniPlayer) this.miniPlayer.style.display = 'none';
  }

  updateMiniPlayer() {
    if (!this.currentStream) return;
    const miniThumb = document.getElementById('miniThumb');
    const miniTitle = document.getElementById('miniTitle');
    const miniArtist = document.getElementById('miniArtist');
    const miniPlay = document.getElementById('miniPlayBtn');
    const queueBadge = document.getElementById('queueBadge');

    if (miniThumb) {
      const t = this.currentStream.thumbnails?.[0]?.url || (this.currentStream.uploader?.avatarUrl) || 'https://via.placeholder.com/48';
      miniThumb.src = t;
    }
    if (miniTitle) {
      miniTitle.innerText = this.currentStream.title || 'Now Playing';
    }
    if (miniArtist) {
      miniArtist.innerText = this.currentStream.uploader?.name || this.currentStream.uploaderName || 'ZenTube';
    }
    if (miniPlay) {
      miniPlay.innerHTML = this.mainVideo.paused ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    }
    if (queueBadge) {
      queueBadge.innerText = this.queue.length;
    }
  }

  expandWatchView() {
    this.hideMiniPlayer();
    if (this.queueDrawer) this.queueDrawer.style.display = 'none';
    this.switchSection(this.watchSection);
  }

  closeMiniPlayer() {
    this.mainVideo.pause();
    if (this.mainAudio.src) this.mainAudio.pause();
    this.hideMiniPlayer();
    if (this.queueDrawer) this.queueDrawer.style.display = 'none';
  }

  togglePlayPause() {
    if (this.mainVideo.paused) {
      this.mainVideo.play().catch(() => {});
      if (this.mainAudio.src) this.mainAudio.play().catch(() => {});
    } else {
      this.mainVideo.pause();
      if (this.mainAudio.src) this.mainAudio.pause();
    }
    this.updateMiniPlayer();
  }

  toggleQueueDrawer() {
    if (!this.queueDrawer) return;
    const isHidden = this.queueDrawer.style.display === 'none' || !this.queueDrawer.style.display;
    this.queueDrawer.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      this.renderQueue();
    }
  }

  toggleAutoplay(enabled) {
    this.autoplayNext = !!enabled;
    const check = document.getElementById('autoplayCheck');
    if (check) check.checked = this.autoplayNext;
  }

  addToQueue(item, playNow = false) {
    if (!item) return;
    const formatted = {
      id: item.id,
      title: item.title,
      uploaderName: item.uploader?.name || item.uploaderName || 'Unknown',
      thumbnails: item.thumbnails || (item.thumbnailUrl ? [{ url: item.thumbnailUrl }] : []),
      durationText: item.durationText || (item.duration ? `${item.duration}s` : ''),
      platform: item.platform || 'youtube',
      url: item.url || null
    };

    if (playNow) {
      const nextIdx = this.queueIndex >= 0 ? this.queueIndex + 1 : 0;
      this.queue.splice(nextIdx, 0, formatted);
      this.playQueueIndex(nextIdx);
    } else {
      this.queue.push(formatted);
      this.renderQueue();
      this.showSponsorToast(`Added to Queue: ${formatted.title.substring(0, 32)}...`);
    }

    const queueBadge = document.getElementById('queueBadge');
    if (queueBadge) queueBadge.innerText = this.queue.length;
  }

  removeFromQueue(index, event) {
    if (event) event.stopPropagation();
    if (index < 0 || index >= this.queue.length) return;

    this.queue.splice(index, 1);
    if (this.queueIndex > index) {
      this.queueIndex--;
    } else if (this.queueIndex === index) {
      if (this.queue.length > 0) {
        const next = Math.min(index, this.queue.length - 1);
        this.playQueueIndex(next);
      } else {
        this.queueIndex = -1;
      }
    }
    this.renderQueue();
  }

  clearQueue() {
    this.queue = [];
    this.queueIndex = -1;
    this.renderQueue();
    const queueBadge = document.getElementById('queueBadge');
    if (queueBadge) queueBadge.innerText = '0';
  }

  renderQueue() {
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    const queueBadge = document.getElementById('queueBadge');

    if (queueCount) queueCount.innerText = this.queue.length;
    if (queueBadge) queueBadge.innerText = this.queue.length;
    if (!queueList) return;

    if (this.queue.length === 0) {
      queueList.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13px;">Queue is empty. Click "+ Queue" on any video or track.</div>';
      return;
    }

    queueList.innerHTML = this.queue
      .map((item, idx) => {
        const isActive = idx === this.queueIndex;
        const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/64x36';
        return `
          <div class="queue-item ${isActive ? 'active' : ''}" onclick="app.playQueueIndex(${idx})">
            <span style="font-size: 11px; color: ${isActive ? 'var(--accent-cyan)' : 'var(--text-dim)'}; width: 18px; display: inline-flex; align-items: center; justify-content: flex-end; font-weight: 700;">
              ${isActive ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>' : idx + 1}
            </span>
            <img class="queue-item-thumb" src="${thumb}" alt="${item.title}">
            <div class="queue-item-info">
              <div class="queue-item-title">${item.title}</div>
              <div class="queue-item-artist">${item.uploaderName} ${item.durationText ? '• ' + item.durationText : ''}</div>
            </div>
            <button class="queue-remove-btn" title="Remove from queue" onclick="app.removeFromQueue(${idx}, event)">&times;</button>
          </div>
        `;
      })
      .join('');
  }

  playQueueIndex(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.queueIndex = index;
    this.renderQueue();

    const item = this.queue[index];
    if (item.url && (item.platform === 'soundcloud' || item.platform === 'bandcamp' || item.platform === 'peertube' || item.platform === 'mediaccc')) {
      this.loadUniversalUrl(item.url);
    } else if (item.id) {
      this.loadVideo(item.id);
    }
  }

  playNext() {
    if (this.queueIndex + 1 < this.queue.length) {
      this.playQueueIndex(this.queueIndex + 1);
      return;
    }

    // If reached the end of queue and autoplay is enabled, pull from related
    if (this.autoplayNext && this.currentStream?.relatedVideos?.length > 0) {
      const nextRelated = this.currentStream.relatedVideos[0];
      this.addToQueue({
        id: nextRelated.id,
        title: nextRelated.title,
        uploaderName: nextRelated.uploaderName,
        thumbnails: nextRelated.thumbnails,
        durationText: nextRelated.duration ? `${nextRelated.duration}s` : '',
        platform: 'youtube'
      }, true);
    }
  }

  playPrevious() {
    if (this.mainVideo.currentTime > 3) {
      this.mainVideo.currentTime = 0;
      if (this.mainAudio.src) this.mainAudio.currentTime = 0;
      return;
    }
    if (this.queueIndex > 0) {
      this.playQueueIndex(this.queueIndex - 1);
    }
  }

  onTrackEnded() {
    if (this.autoplayNext) {
      this.showSponsorToast('Playing next in queue...');
      this.playNext();
    }
  }

  syncQueueCurrentTrack(stream) {
    if (!stream) return;
    const existingIdx = this.queue.findIndex(q => q.id === stream.id || (q.url && q.url === stream.url));
    if (existingIdx !== -1) {
      this.queueIndex = existingIdx;
    } else {
      const newItem = {
        id: stream.id,
        title: stream.title,
        uploaderName: stream.uploader?.name || stream.uploaderName || 'Unknown',
        thumbnails: stream.thumbnails || [],
        durationText: stream.duration ? `${stream.duration}s` : '',
        platform: stream.platform || 'youtube',
        url: stream.url || null
      };
      if (this.queue.length === 0) {
        this.queue = [newItem];
        this.queueIndex = 0;
      } else {
        const insertAt = this.queueIndex >= 0 ? this.queueIndex : 0;
        this.queue.splice(insertAt, 0, newItem);
        this.queueIndex = insertAt;
      }
    }
    this.renderQueue();
  }

  setupMediaSession(stream) {
    if (!('mediaSession' in navigator)) return;
    try {
      const artwork = (stream.thumbnails || []).map((t) => ({
        src: t.url,
        sizes: `${t.width || 512}x${t.height || 512}`,
        type: 'image/jpeg'
      }));

      navigator.mediaSession.metadata = new MediaMetadata({
        title: stream.title || 'ZenTube Track',
        artist: stream.uploader?.name || stream.uploaderName || 'ZenTube',
        album: stream.platform ? stream.platform.toUpperCase() : 'ZenTube',
        artwork: artwork.length > 0 ? artwork : [{ src: 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }]
      });

      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrevious());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seekTo(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(Math.max(0, this.mainVideo.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seekTo(this.mainVideo.currentTime + offset);
      });
    } catch {}
  }

  playAllPlaylist() {
    if (!this.currentPlaylist || !this.currentPlaylist.videos || this.currentPlaylist.videos.length === 0) return;
    this.queue = this.currentPlaylist.videos.map((v) => ({
      id: v.id,
      title: v.title,
      uploaderName: this.currentPlaylist.uploaderName || 'Unknown',
      thumbnails: v.thumbnails || [],
      durationText: v.durationText || '',
      platform: 'youtube',
      url: null
    }));
    this.queueIndex = 0;
    this.renderQueue();
    this.playQueueIndex(0);
  }

  queueAllPlaylist() {
    if (!this.currentPlaylist || !this.currentPlaylist.videos || this.currentPlaylist.videos.length === 0) return;
    const added = this.currentPlaylist.videos.map((v) => ({
      id: v.id,
      title: v.title,
      uploaderName: this.currentPlaylist.uploaderName || 'Unknown',
      thumbnails: v.thumbnails || [],
      durationText: v.durationText || '',
      platform: 'youtube',
      url: null
    }));
    this.queue.push(...added);
    this.renderQueue();
    this.showSponsorToast(`Added all ${added.length} tracks to Queue`);
  }

  // --- LOCAL WATCH HISTORY & BOOKMARKS ENGINE (ZERO-CLOUD) ---
  loadLocalData() {
    try {
      const h = localStorage.getItem('zentube_history');
      if (h) this.history = JSON.parse(h);
      if (!Array.isArray(this.history)) this.history = [];
    } catch {
      this.history = [];
    }

    try {
      const b = localStorage.getItem('zentube_bookmarks');
      if (b) this.bookmarks = JSON.parse(b);
      if (!Array.isArray(this.bookmarks)) this.bookmarks = [];
    } catch {
      this.bookmarks = [];
    }

    try {
      const p = localStorage.getItem('zentube_custom_playlists');
      if (p) this.customPlaylists = JSON.parse(p);
      if (!Array.isArray(this.customPlaylists)) this.customPlaylists = [];
    } catch {
      this.customPlaylists = [];
    }
  }

  saveHistory() {
    try {
      localStorage.setItem('zentube_history', JSON.stringify(this.history.slice(0, 250)));
    } catch {}
  }

  saveBookmarks() {
    try {
      localStorage.setItem('zentube_bookmarks', JSON.stringify(this.bookmarks));
    } catch {}
  }

  saveCustomPlaylists() {
    try {
      localStorage.setItem('zentube_custom_playlists', JSON.stringify(this.customPlaylists));
    } catch {}
  }

  recordHistoryProgress(isCompleted = false) {
    if (!this.currentStream) return;
    const s = this.currentStream;
    const v = this.mainVideo;
    const curSec = isCompleted ? (s.duration || 0) : Math.floor(v.currentTime || 0);
    const duration = s.duration || Math.floor(v.duration || 0);

    const existingIdx = this.history.findIndex((h) => h.id === s.id || (h.url && h.url === s.url));
    const entry = {
      id: s.id,
      title: s.title,
      uploaderName: s.uploader?.name || s.uploaderName || 'Unknown',
      thumbnails: s.thumbnails || [],
      duration: duration,
      durationText: s.durationText || (duration ? `${duration}s` : ''),
      progressSeconds: curSec,
      progressPercentage: duration > 0 ? Math.min(100, Math.round((curSec / duration) * 100)) : 0,
      isCompleted: isCompleted || (duration > 0 && curSec >= duration - 8),
      lastWatched: Date.now(),
      platform: s.platform || 'youtube',
      url: s.url || null
    };

    if (existingIdx !== -1) {
      this.history.splice(existingIdx, 1);
    }
    this.history.unshift(entry);
    this.saveHistory();
  }

  checkResumePrompt(stream) {
    const prompt = document.getElementById('resumePrompt');
    const timeText = document.getElementById('resumeTimeText');
    if (!prompt || !timeText) return;

    const entry = this.history.find((h) => (h.id === stream.id || (h.url && h.url === stream.url)) && !h.isCompleted);
    if (entry && entry.progressSeconds > 10 && entry.progressSeconds < (stream.duration || 999999) - 15) {
      this._pendingResumeSeconds = entry.progressSeconds;
      timeText.innerText = this.formatSeconds(entry.progressSeconds);
      prompt.style.display = 'flex';
    } else {
      this._pendingResumeSeconds = 0;
      prompt.style.display = 'none';
    }
  }

  confirmResume() {
    if (this._pendingResumeSeconds > 0) {
      this.seekTo(this._pendingResumeSeconds);
      this.showSponsorToast(`Resumed from ${this.formatSeconds(this._pendingResumeSeconds)}`);
    }
    this.dismissResume();
  }

  dismissResume() {
    this._pendingResumeSeconds = 0;
    const prompt = document.getElementById('resumePrompt');
    if (prompt) prompt.style.display = 'none';
  }

  toggleBookmark() {
    if (!this.currentStream) return;
    const s = this.currentStream;
    const idx = this.bookmarks.findIndex((b) => b.id === s.id || (b.url && b.url === s.url));

    if (idx !== -1) {
      this.bookmarks.splice(idx, 1);
      this.showSponsorToast('Removed from Bookmarks');
    } else {
      const entry = {
        id: s.id,
        title: s.title,
        uploaderName: s.uploader?.name || s.uploaderName || 'Unknown',
        thumbnails: s.thumbnails || [],
        duration: s.duration || 0,
        durationText: s.durationText || (s.duration ? `${s.duration}s` : ''),
        bookmarkedAt: Date.now(),
        platform: s.platform || 'youtube',
        url: s.url || null
      };
      this.bookmarks.unshift(entry);
      this.showSponsorToast('Added to Bookmarks');
    }

    this.saveBookmarks();
    this.updateBookmarkButton();
  }

  updateBookmarkButton() {
    const btn = document.getElementById('bookmarkBtn');
    if (!btn || !this.currentStream) return;
    const s = this.currentStream;
    const isBookmarked = this.bookmarks.some((b) => b.id === s.id || (b.url && b.url === s.url));

    const span = btn.querySelector('span'); if (span) span.innerText = isBookmarked ? 'Bookmarked' : 'Bookmark'; else btn.innerText = isBookmarked ? 'Bookmarked' : 'Bookmark';
    btn.classList.toggle('active', isBookmarked);
  }

  showHistory() {
    this.currentLibraryMode = 'history';
    document.getElementById('libraryTitle').innerText = 'Local Watch History';
    document.getElementById('librarySubtitle').innerText = `${this.history.length} items • 100% private on-device storage`;
    const b1 = document.getElementById('libraryClearBtn'); if (b1.querySelector('span')) b1.querySelector('span').innerText = 'Clear History'; else b1.innerText = 'Clear History';
    this.renderLibrary();
    this.switchSection(this.librarySection);
  }

  showBookmarks() {
    this.currentLibraryMode = 'bookmarks';
    document.getElementById('libraryTitle').innerText = 'Saved Bookmarks & Favorites';
    document.getElementById('librarySubtitle').innerText = `${this.bookmarks.length} items • 100% private on-device storage`;
    const b2 = document.getElementById('libraryClearBtn'); if (b2.querySelector('span')) b2.querySelector('span').innerText = 'Clear Bookmarks'; else b2.innerText = 'Clear Bookmarks';
    this.renderLibrary();
    this.switchSection(this.librarySection);
  }

  renderLibrary() {
    const grid = document.getElementById('libraryGrid');
    if (!grid) return;

    const isHistory = this.currentLibraryMode === 'history';
    const items = isHistory ? this.history : this.bookmarks;

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; padding: 48px 20px; text-align: center; color: var(--text-dim);">
          <div style="margin-bottom: 12px; color: var(--accent-cyan);"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
          <h3>${isHistory ? 'Your Watch History is Empty' : 'No Bookmarks Yet'}</h3>
          <p style="margin-top: 6px; font-size: 13px;">${isHistory ? 'Videos and tracks you play will be recorded locally on this device.' : 'Click "Bookmark" on any video to save it for later.'}</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/320x180';
        const safeTitle = (item.title || '').replace(/'/g, "\\'");
        const safeAuthor = (item.uploaderName || '').replace(/'/g, "\\'");
        const clickAction = (item.url && item.platform !== 'youtube') ? `app.loadUniversalUrl('${item.url}')` : `app.loadVideo('${item.id}')`;
        const percent = item.progressPercentage || 0;

        return `
          <div class="video-card" onclick="${clickAction}">
            <div class="thumb-container">
              <img class="thumb-img" src="${thumb}" loading="lazy" alt="${item.title}">
              ${item.durationText ? `<span class="duration-badge">${item.durationText}</span>` : ''}
              ${isHistory && percent > 0 ? `<div class="watch-progress-bar"><div class="watch-progress-fill" style="width: ${percent}%;"></div></div>` : ''}
              <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${item.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: '${item.durationText || ''}', platform: '${item.platform || 'youtube'}' })">+ Queue</button>
              <button class="card-remove-btn" title="Remove" onclick="event.stopPropagation(); ${isHistory ? `app.removeFromHistory('${item.id}')` : `app.removeFromBookmarks('${item.id}')`}">&times;</button>
            </div>
            <div class="card-details">
              <span class="badge" style="width: max-content; margin-bottom: 4px;">${(item.platform || 'youtube').toUpperCase()}</span>
              <h3 class="card-title">${item.title}</h3>
              <div class="card-channel">${item.uploaderName}</div>
              <div class="card-meta">${isHistory ? (item.isCompleted ? 'Watched' : `Progress: ${percent}% • ${new Date(item.lastWatched).toLocaleDateString()}`) : `Saved on ${new Date(item.bookmarkedAt).toLocaleDateString()}`}</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  removeFromHistory(id) {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveHistory();
    this.renderLibrary();
    const sub = document.getElementById('librarySubtitle');
    if (sub) sub.innerText = `${this.history.length} items • 100% private on-device storage`;
  }

  removeFromBookmarks(id) {
    this.bookmarks = this.bookmarks.filter((b) => b.id !== id);
    this.saveBookmarks();
    this.renderLibrary();
    const sub = document.getElementById('librarySubtitle');
    if (sub) sub.innerText = `${this.bookmarks.length} items • 100% private on-device storage`;
    this.updateBookmarkButton();
  }

  clearLibrary() {
    const isHistory = this.currentLibraryMode === 'history';
    const msg = isHistory ? 'Are you sure you want to clear your local watch history?' : 'Are you sure you want to clear all bookmarks?';
    if (!confirm(msg)) return;

    if (isHistory) {
      this.history = [];
      this.saveHistory();
    } else {
      this.bookmarks = [];
      this.saveBookmarks();
      this.updateBookmarkButton();
    }
    this.renderLibrary();
    const sub = document.getElementById('librarySubtitle');
    if (sub) sub.innerText = `0 items • 100% private on-device storage`;
  }

  exportLibrary() {
    const data = {
      app: 'ZenTube',
      version: 1,
      exportedAt: new Date().toISOString(),
      history: this.history,
      bookmarks: this.bookmarks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentube-library-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- WEB AUDIO DSP / EQUALIZER & SPEED SYSTEM ---
  initAudioDsp() {
    if (this.audioCtx) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();

      // Low Shelf Filter for Bass
      this.bassFilter = this.audioCtx.createBiquadFilter();
      this.bassFilter.type = 'lowshelf';
      this.bassFilter.frequency.value = 120; // 120 Hz
      this.bassFilter.gain.value = 0;

      // Peaking Filter for Mids / Vocals
      this.midFilter = this.audioCtx.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1500; // 1.5 kHz
      this.midFilter.Q.value = 1.0;
      this.midFilter.gain.value = 0;

      // High Shelf Filter for Treble
      this.trebleFilter = this.audioCtx.createBiquadFilter();
      this.trebleFilter.type = 'highshelf';
      this.trebleFilter.frequency.value = 6000; // 6 kHz
      this.trebleFilter.gain.value = 0;

      // Master Preamp Gain Node
      this.preampGain = this.audioCtx.createGain();
      this.preampGain.gain.value = 1.0;

      // Connect DSP chain: Bass -> Mid -> Treble -> Preamp -> Destination
      this.bassFilter.connect(this.midFilter);
      this.midFilter.connect(this.trebleFilter);
      this.trebleFilter.connect(this.preampGain);
      this.preampGain.connect(this.audioCtx.destination);

      // Connect video element
      this.mainVideo.crossOrigin = 'anonymous';
      this.videoAudioSource = this.audioCtx.createMediaElementSource(this.mainVideo);
      this.videoAudioSource.connect(this.bassFilter);

      // Connect separate audio element if present
      this.mainAudio.crossOrigin = 'anonymous';
      this.audioSource = this.audioCtx.createMediaElementSource(this.mainAudio);
      this.audioSource.connect(this.bassFilter);
    } catch (e) {
      console.warn('Web Audio DSP initialization note:', e.message);
    }
  }

  ensureAudioContextRunning() {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  toggleEqPanel() {
    this.initAudioDsp();
    this.ensureAudioContextRunning();
    const p = document.getElementById('eqPanel');
    if (!p) return;
    p.style.display = (p.style.display === 'none' || !p.style.display) ? 'block' : 'none';
  }

  updateEqBand(band, val) {
    this.initAudioDsp();
    this.ensureAudioContextRunning();
    const num = parseFloat(val);

    if (band === 'bass') {
      if (this.bassFilter) this.bassFilter.gain.value = num;
      document.getElementById('bassValue').innerText = `${num > 0 ? '+' : ''}${num} dB`;
    } else if (band === 'mid') {
      if (this.midFilter) this.midFilter.gain.value = num;
      document.getElementById('midValue').innerText = `${num > 0 ? '+' : ''}${num} dB`;
    } else if (band === 'treble') {
      if (this.trebleFilter) this.trebleFilter.gain.value = num;
      document.getElementById('trebleValue').innerText = `${num > 0 ? '+' : ''}${num} dB`;
    } else if (band === 'preamp') {
      const gainFactor = num / 100;
      if (this.preampGain) this.preampGain.gain.value = gainFactor;
      document.getElementById('preampValue').innerText = `${num}%`;
    }

    const presetSelect = document.getElementById('eqPresetSelect');
    if (presetSelect && presetSelect.value !== 'custom') {
      presetSelect.value = 'custom';
    }
  }

  applyEqPreset(preset) {
    this.initAudioDsp();
    this.ensureAudioContextRunning();

    const presets = {
      flat: { bass: 0, mid: 0, treble: 0, preamp: 100 },
      bass: { bass: 9, mid: 0, treble: -2, preamp: 120 },
      vocal: { bass: -3, mid: 8, treble: 4, preamp: 110 },
      treble: { bass: -2, mid: 1, treble: 9, preamp: 100 },
      night: { bass: -6, mid: 4, treble: -6, preamp: 90 },
      custom: null
    };

    const p = presets[preset];
    if (!p) return;

    document.getElementById('bassSlider').value = p.bass;
    document.getElementById('midSlider').value = p.mid;
    document.getElementById('trebleSlider').value = p.treble;
    document.getElementById('preampSlider').value = p.preamp;

    document.getElementById('bassValue').innerText = `${p.bass > 0 ? '+' : ''}${p.bass} dB`;
    document.getElementById('midValue').innerText = `${p.mid > 0 ? '+' : ''}${p.mid} dB`;
    document.getElementById('trebleValue').innerText = `${p.treble > 0 ? '+' : ''}${p.treble} dB`;
    document.getElementById('preampValue').innerText = `${p.preamp}%`;

    if (this.bassFilter) this.bassFilter.gain.value = p.bass;
    if (this.midFilter) this.midFilter.gain.value = p.mid;
    if (this.trebleFilter) this.trebleFilter.gain.value = p.treble;
    if (this.preampGain) this.preampGain.gain.value = p.preamp / 100;

    document.getElementById('eqPresetSelect').value = preset;
    this.showSponsorToast(`EQ: ${preset.toUpperCase()} preset applied`);
  }

  setPlaybackSpeed(speed) {
    const num = parseFloat(speed);
    this.mainVideo.playbackRate = num;
    this.mainVideo.preservesPitch = true;
    if (this.mainAudio.src) {
      this.mainAudio.playbackRate = num;
      this.mainAudio.preservesPitch = true;
    }

    document.querySelectorAll('.speed-btn').forEach((btn) => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === num);
    });

    this.showSponsorToast(`Speed: ${num}x (Pitch Preserved)`);
  }

  
  updateEq() {
    const bass = document.getElementById('bassSlider')?.value || 0;
    const mid = document.getElementById('midSlider')?.value || 0;
    const treble = document.getElementById('trebleSlider')?.value || 0;
    const preamp = document.getElementById('preampSlider')?.value || 100;
    this.updateEqBand('bass', bass);
    this.updateEqBand('mid', mid);
    this.updateEqBand('treble', treble);
    this.updateEqBand('preamp', preamp);
  }

  exportOpml() {
    window.open('/api/subscriptions/opml', '_blank');
  }

  exportNewPipeJson() {
    window.open('/api/subscriptions/newpipe', '_blank');
  }

  async handleOpmlUpload(e) {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const isXml = text.trim().startsWith('<');
      const endpoint = isXml ? '/api/subscriptions/opml' : '/api/subscriptions/newpipe';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': isXml ? 'application/xml' : 'application/json' },
        body: text,
      });
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        this.subscriptions = items;
        try { localStorage.setItem('zentube_subscriptions', JSON.stringify(items)); } catch {}
        this.renderSubscriptions();
        this.showSponsorToast('Imported ' + items.length + ' subscriptions!');
      } else {
        this.showError('No valid subscriptions found in file.');
      }
    } catch (err) {
      this.showError('Failed to import file: ' + err.message);
    }
  }

  resetEq() {
    this.applyEqPreset('flat');
    this.setPlaybackSpeed(1.0);
  }

  // ==================== MEDIA DOWNLOADER ====================
  openDownloadModal() {
    if (!this.currentStream) {
      this.showError('No media stream is currently loaded to download.');
      return;
    }
    if (this.downloadModalTitle) {
      this.downloadModalTitle.innerText = this.currentStream.title || 'Selected Media';
    }
    if (this.downloadStatus) {
      this.downloadStatus.style.display = 'none';
    }
    if (this.downloadModal) {
      this.downloadModal.style.display = 'flex';
    }
  }

  closeDownloadModal() {
    if (this.downloadModal) {
      this.downloadModal.style.display = 'none';
    }
  }

  triggerDownload(quality) {
    if (!this.currentStream) return;
    const id = this.currentStream.id || this.currentStream.url;
    if (!id) return;

    if (this.downloadStatus && this.downloadStatusText) {
      this.downloadStatus.style.display = 'flex';
      this.downloadStatusText.innerText = `Preparing ${quality.toUpperCase()} media stream for download...`;
    }

    const downloadUrl = `/api/download?id=${encodeURIComponent(id)}&quality=${encodeURIComponent(quality)}`;

    // Create anchor to trigger browser file download
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      if (this.downloadStatus && this.downloadStatusText) {
        this.downloadStatusText.innerText = `Download initiated! Check your browser's download manager.`;
      }
      setTimeout(() => {
        this.closeDownloadModal();
      }, 1500);
    }, 1000);
  }

  // ==================== FALLBACK MIRRORS ====================
  openMirrorsModal() {
    if (this.mirrorsModal) {
      this.mirrorsModal.style.display = 'flex';
    }
    this.refreshMirrors();
  }

  closeMirrorsModal() {
    if (this.mirrorsModal) {
      this.mirrorsModal.style.display = 'none';
    }
  }

  async checkMirrors() {
    try {
      const res = await fetch('/api/mirrors?fast=true');
      if (res.ok) {
        const data = await res.json();
        const mirrors = data.mirrors || [];
        const online = mirrors.filter((m) => m.healthy).length;
        if (this.mirrorStatusText) {
          this.mirrorStatusText.innerText = `Mirrors: ${online > 0 ? online + ' Online' : 'Active'}`;
        }
      }
    } catch {
      if (this.mirrorStatusText) {
        this.mirrorStatusText.innerText = 'Mirrors: Active';
      }
    }
  }

  async refreshMirrors() {
    if (this.mirrorsTableBody) {
      this.mirrorsTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 24px;"><span class="status-spinner" style="display:inline-block; margin-right:8px;"></span> Benchmarking Invidious & Piped public mirrors...</td></tr>';
    }
    if (this.mirrorsSummaryText) {
      this.mirrorsSummaryText.innerText = 'Pinging instances...';
    }

    try {
      const res = await fetch('/api/mirrors/refresh', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const mirrors = data.mirrors || [];
      const online = mirrors.filter((m) => m.healthy).length;

      if (this.mirrorsSummaryText) {
        this.mirrorsSummaryText.innerText = `${online} of ${mirrors.length} mirrors active & healthy`;
      }
      if (this.mirrorStatusText) {
        this.mirrorStatusText.innerText = `Mirrors: ${online} Online`;
      }

      if (this.mirrorsTableBody) {
        this.mirrorsTableBody.innerHTML = mirrors.map((m) => `
          <tr>
            <td>
              <strong>${this.escapeHtml(m.name)}</strong>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${this.escapeHtml(m.url)}</div>
            </td>
            <td><span style="text-transform: capitalize; color: var(--text-muted);">${this.escapeHtml(m.type)}</span></td>
            <td>${m.healthy ? `<span style="color: var(--accent-cyan); font-weight: 600;">${m.latencyMs} ms</span>` : '<span style="color: var(--text-dim);">--</span>'}</td>
            <td>
              <span class="mirror-badge ${m.healthy ? 'online' : 'offline'}">
                ${m.healthy ? 'ONLINE' : 'OFFLINE'}
              </span>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      if (this.mirrorsTableBody) {
        this.mirrorsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#ff4444; padding:20px;">Failed to benchmark mirrors: ${this.escapeHtml(err.message)}</td></tr>`;
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const s = Math.floor(seconds);
    const m = Math.floor(s / 60);
    const remS = s % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, '0')}:${remS.toString().padStart(2, '0')}`;
    }
    return `${remM}:${remS.toString().padStart(2, '0')}`;
  }

  // --- 1. TRENDING & POPULAR BY CATEGORY & REGION ---
  async loadTrending(category = this.currentTrendingCategory || 'all', region = this.currentTrendingRegion || 'US') {
    this.currentTrendingCategory = category;
    this.currentTrendingRegion = region;
    this.showLoader(`Loading ${category.toUpperCase()} trends (${region})...`);
    try {
      const res = await fetch(`/api/trending?category=${encodeURIComponent(category)}&region=${encodeURIComponent(region)}`);
      const data = await res.json();
      this.hideLoader();

      if (data.error) {
        this.showError(data.error);
        return;
      }

      const grid = document.getElementById('trendingGrid');
      if (!data.items || data.items.length === 0) {
        grid.innerHTML = `<div class="empty-state-card" style="grid-column: 1 / -1; padding: 40px; text-align: center;"><p>No trending videos found for ${region} in ${category}.</p></div>`;
      } else {
        grid.innerHTML = data.items.map((item) => {
          const thumb = item.thumbnails?.[0]?.url || 'https://via.placeholder.com/320x180';
          const safeTitle = (item.title || '').replace(/'/g, "\\'");
          const safeAuthor = (item.uploader?.name || item.uploaderName || '').replace(/'/g, "\\'");
          const isLive = item.durationText === 'LIVE' || item.isLive;
          return `
            <div class="video-card" onclick="app.loadVideo('${item.id}')">
              <div class="thumb-container">
                <img class="thumb-img" src="${thumb}" loading="lazy" alt="${this.escapeHtml(item.title)}">
                ${isLive ? '<span class="duration-badge live"><span class="live-dot-pulse"></span> LIVE</span>' : (item.durationText ? `<span class="duration-badge">${item.durationText}</span>` : '')}
                <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${item.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: '${isLive ? 'LIVE' : (item.durationText || '')}', platform: 'youtube' })">+ Queue</button>
              </div>
              <div class="card-details">
                <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
                <div class="card-channel">${this.escapeHtml(item.uploader?.name || item.uploaderName || 'YouTube')} ${item.uploader?.verified ? '<svg class="verified-check" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}</div>
                <div class="card-meta">${item.viewCountText || (item.viewCount ? item.viewCount.toLocaleString() + ' views' : '')} ${item.uploadedDate ? '• ' + item.uploadedDate : ''}</div>
              </div>
            </div>
          `;
        }).join('');
      }

      this.switchSection(this.trendingSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Failed to load trending: ' + err.message);
    }
  }

  switchTrendingCategory(cat) {
    this.currentTrendingCategory = cat;
    document.querySelectorAll('.trending-cat-btn').forEach((btn) => {
      if (btn.dataset.category === cat) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    this.loadTrending(cat, this.currentTrendingRegion);
  }

  switchTrendingRegion(region) {
    this.currentTrendingRegion = region;
    this.loadTrending(this.currentTrendingCategory, region);
  }

  // --- 2. UNIFIED SUBSCRIPTIONS FEED AGGREGATOR ---
  async loadSubscriptionsFeed() {
    this.showLoader('Aggregating subscription feeds...');
    try {
      const channels = (this.subscriptions || []).map(s => s.url || s.name || s.channelId).filter(Boolean);
      const res = await fetch('/api/feed/aggregated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels: channels.length ? channels : ['@NoCopyrightSounds', '@veritasium', '@LinusTechTips'], maxTotal: 30 })
      });
      const data = await res.json();
      this.hideLoader();

      if (data.error) {
        this.showError(data.error);
        return;
      }

      const items = Array.isArray(data) ? data : (data.items || []);
      const channelsCount = data.channelsCount || channels.length;

      const heading = document.getElementById('feedHeading');
      if (heading) heading.innerText = `Unified Subscriptions Feed (${items.length} items from ${channelsCount} channels)`;

      const grid = document.getElementById('feedGrid');
      if (items.length === 0) {
        grid.innerHTML = `<div class="empty-state-card" style="grid-column: 1 / -1; padding: 40px; text-align: center;"><p>No subscription items found.</p></div>`;
      } else {
        grid.innerHTML = items.map((item) => {
        const safeTitle = (item.title || '').replace(/'/g, "\\'");
        const safeAuthor = (item.channelTitle || '').replace(/'/g, "\\'");
        const thumb = item.thumbnailUrl || 'https://via.placeholder.com/320x180';
        return `
          <div class="video-card" onclick="app.loadVideo('${item.id}')">
            <div class="thumb-container">
              <img class="thumb-img" src="${thumb}" loading="lazy" alt="${this.escapeHtml(item.title)}">
              <span class="duration-badge feed-badge">FEED</span>
              <button class="card-queue-btn" title="Add to Queue" onclick="event.stopPropagation(); app.addToQueue({ id: '${item.id}', title: '${safeTitle}', uploaderName: '${safeAuthor}', thumbnails: [{ url: '${thumb}' }], durationText: 'FEED', platform: 'youtube' })">+ Queue</button>
            </div>
            <div class="card-details">
              <div class="card-badge-row">
                <span class="feed-sub-badge">SUB FEED</span>
              </div>
              <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
              <div class="card-channel">${this.escapeHtml(item.channelTitle)}</div>
            </div>
          </div>
        `;
      }).join('');
    }

      this.switchSection(this.feedSection);
    } catch (err) {
      this.hideLoader();
      this.showError('Feed aggregation failed: ' + err.message);
    }
  }

  // --- 3. CUSTOM LOCAL PLAYLISTS MANAGER ---
  showPlaylists() {
    this.showPlaylistsGrid();
    this.switchSection(this.customPlaylistsSection);
  }

  showPlaylistsGrid() {
    if (this.singlePlaylistDetail) this.singlePlaylistDetail.style.display = 'none';
    if (this.customPlaylistsGrid) this.customPlaylistsGrid.style.display = 'grid';
    this.renderCustomPlaylists();
  }

  renderCustomPlaylists() {
    const grid = document.getElementById('customPlaylistsGrid');
    const subtitle = document.getElementById('playlistsSubtitle');
    if (subtitle) {
      subtitle.innerText = `${this.customPlaylists.length} local playlist${this.customPlaylists.length === 1 ? '' : 's'} saved on this device`;
    }

    if (!this.customPlaylists || this.customPlaylists.length === 0) {
      grid.innerHTML = `
        <div class="empty-playlist-state">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          <h3>No Custom Playlists Yet</h3>
          <p>Create your first custom offline playlist to organize your favorite tracks and videos.</p>
          <button class="action-glow-btn" onclick="app.openNewPlaylistModal()">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Create Playlist</span>
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.customPlaylists.map((pl) => {
      const trackCount = pl.tracks ? pl.tracks.length : 0;
      const defaultCover = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%2311141c'/%3E%3Cpolygon points='160,50 190,100 130,100' stroke='%2300f0ff' stroke-width='2' fill='none'/%3E%3Cline x1='120' y1='115' x2='200' y2='115' stroke='%2300f0ff' stroke-width='2'/%3E%3Cline x1='135' y1='125' x2='185' y2='125' stroke='%2300f0ff' stroke-width='2'/%3E%3C/svg%3E";
      const firstThumb = pl.tracks?.[0]?.thumbnail || defaultCover;
      return `
        <div class="custom-playlist-card" onclick="app.viewPlaylist('${pl.id}')">
          <div class="playlist-card-cover">
            <img src="${firstThumb}" alt="${this.escapeHtml(pl.name)}" loading="lazy">
            <div class="playlist-badge-count">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              <span>${trackCount} track${trackCount === 1 ? '' : 's'}</span>
            </div>
          </div>
          <div class="playlist-card-body">
            <h3 class="playlist-card-name">${this.escapeHtml(pl.name)}</h3>
            <p class="playlist-card-desc">${this.escapeHtml(pl.description || 'No description')}</p>
            <div class="playlist-card-actions" onclick="event.stopPropagation()">
              <button class="pl-mini-btn play" onclick="app.playAllCustomPlaylist('${pl.id}')" title="Play All">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Play</span>
              </button>
              <button class="pl-mini-btn queue" onclick="app.queueAllCustomPlaylist('${pl.id}')" title="Queue All">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Queue</span>
              </button>
              <button class="pl-mini-btn delete" onclick="app.deletePlaylist('${pl.id}')" title="Delete">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  openNewPlaylistModal() {
    const modal = document.getElementById('newPlaylistModal');
    if (modal) {
      modal.style.display = 'flex';
      const nameInput = document.getElementById('newPlaylistName');
      const descInput = document.getElementById('newPlaylistDescription');
      if (nameInput) nameInput.value = '';
      if (descInput) descInput.value = '';
      setTimeout(() => nameInput?.focus(), 100);
    }
  }

  closeNewPlaylistModal() {
    const modal = document.getElementById('newPlaylistModal');
    if (modal) modal.style.display = 'none';
  }

  createPlaylistSubmit() {
    const nameInput = document.getElementById('newPlaylistName');
    const descInput = document.getElementById('newPlaylistDescription');
    const name = nameInput?.value.trim();
    if (!name) {
      nameInput?.focus();
      return;
    }

    const newPl = {
      id: 'cpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name,
      description: descInput ? descInput.value.trim() : '',
      createdAt: Date.now(),
      tracks: []
    };

    this.customPlaylists.unshift(newPl);
    this.saveCustomPlaylists();
    this.closeNewPlaylistModal();
    this.showSponsorToast(`Created playlist "${name}"`);

    if (this.customPlaylistsSection && this.customPlaylistsSection.style.display === 'block') {
      this.renderCustomPlaylists();
    }
    const addModal = document.getElementById('addToPlaylistModal');
    if (addModal && addModal.style.display === 'flex') {
      this.renderAddToPlaylistList();
    }
  }

  openAddToPlaylistModal() {
    if (!this.currentStream) {
      this.showError('No active video playing to add to playlist.');
      return;
    }
    this.renderAddToPlaylistList();
    const modal = document.getElementById('addToPlaylistModal');
    if (modal) modal.style.display = 'flex';
  }

  closeAddToPlaylistModal() {
    const modal = document.getElementById('addToPlaylistModal');
    if (modal) modal.style.display = 'none';
  }

  renderAddToPlaylistList() {
    const container = document.getElementById('addToPlaylistList');
    if (!container) return;

    if (!this.customPlaylists || this.customPlaylists.length === 0) {
      container.innerHTML = `<p class="empty-hint" style="color: var(--text-dim); text-align: center; padding: 20px;">No custom playlists exist yet. Click "+ New Playlist" to start.</p>`;
      return;
    }

    const curId = this.currentStream?.id;
    container.innerHTML = this.customPlaylists.map((pl) => {
      const hasTrack = pl.tracks && pl.tracks.some(t => t.id === curId);
      return `
        <div class="add-pl-item" onclick="app.toggleTrackInPlaylist('${pl.id}')">
          <div class="add-pl-left">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            <div>
              <strong>${this.escapeHtml(pl.name)}</strong>
              <small>${pl.tracks ? pl.tracks.length : 0} tracks</small>
            </div>
          </div>
          <button class="add-pl-btn ${hasTrack ? 'added' : ''}">
            ${hasTrack ? 'Added' : '+ Add'}
          </button>
        </div>
      `;
    }).join('');
  }

  toggleTrackInPlaylist(playlistId) {
    if (!this.currentStream) return;
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    if (!pl.tracks) pl.tracks = [];

    const cur = this.currentStream;
    const trackIndex = pl.tracks.findIndex(t => t.id === cur.id);
    if (trackIndex !== -1) {
      pl.tracks.splice(trackIndex, 1);
      this.showSponsorToast(`Removed from "${pl.name}"`);
    } else {
      pl.tracks.push({
        id: cur.id,
        title: cur.title,
        uploader: cur.uploader?.name || cur.uploaderName || 'Unknown',
        thumbnail: cur.thumbnails?.[0]?.url || '',
        duration: cur.duration || 0,
        durationText: cur.durationText || '',
        platform: cur.platform || 'youtube',
        url: cur.url || null
      });
      this.showSponsorToast(`Added to "${pl.name}"`);
    }

    this.saveCustomPlaylists();
    this.renderAddToPlaylistList();
  }

  viewPlaylist(playlistId) {
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl) return;
    this.activePlaylistId = playlistId;

    if (this.customPlaylistsGrid) this.customPlaylistsGrid.style.display = 'none';
    if (this.singlePlaylistDetail) this.singlePlaylistDetail.style.display = 'block';

    const titleEl = document.getElementById('currentPlaylistTitle');
    const descEl = document.getElementById('currentPlaylistDesc');
    if (titleEl) titleEl.innerText = pl.name;
    if (descEl) descEl.innerText = pl.description || `${pl.tracks ? pl.tracks.length : 0} tracks`;

    this.renderSinglePlaylistTracks(pl);
    this.switchSection(this.customPlaylistsSection);
  }

  renderSinglePlaylistTracks(pl) {
    const container = document.getElementById('singlePlaylistTracks');
    if (!container) return;

    if (!pl.tracks || pl.tracks.length === 0) {
      container.innerHTML = `
        <div class="empty-state-card" style="padding: 40px; text-align: center; color: var(--text-dim);">
          <p>This playlist is empty. Add tracks while browsing or watching videos!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pl.tracks.map((track, idx) => {
      return `
        <div class="playlist-track-row" onclick="app.loadVideo('${track.id}')">
          <div class="track-left">
            <span class="track-index">${idx + 1}</span>
            <img class="track-thumb" src="${track.thumbnail || 'https://via.placeholder.com/120'}" loading="lazy" alt="${this.escapeHtml(track.title)}">
            <div class="track-meta">
              <strong class="track-title">${this.escapeHtml(track.title)}</strong>
              <span class="track-uploader">${this.escapeHtml(track.uploader)}</span>
            </div>
          </div>
          <div class="track-right" onclick="event.stopPropagation()">
            <span class="track-duration">${track.durationText || ''}</span>
            <button class="track-ctrl-btn" onclick="app.moveTrackInPlaylist('${pl.id}', ${idx}, -1)" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
            <button class="track-ctrl-btn" onclick="app.moveTrackInPlaylist('${pl.id}', ${idx}, 1)" title="Move Down" ${idx === pl.tracks.length - 1 ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <button class="track-ctrl-btn remove" onclick="app.removeTrackFromPlaylist('${pl.id}', ${idx})" title="Remove from Playlist">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  moveTrackInPlaylist(playlistId, index, direction) {
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl || !pl.tracks) return;
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= pl.tracks.length) return;

    const [item] = pl.tracks.splice(index, 1);
    pl.tracks.splice(targetIdx, 0, item);
    this.saveCustomPlaylists();
    this.renderSinglePlaylistTracks(pl);
  }

  removeTrackFromPlaylist(playlistId, index) {
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl || !pl.tracks) return;
    pl.tracks.splice(index, 1);
    this.saveCustomPlaylists();
    this.renderSinglePlaylistTracks(pl);
    this.showSponsorToast('Removed track from playlist');
  }

  playAllCustomPlaylist(playlistId = this.activePlaylistId) {
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl || !pl.tracks || pl.tracks.length === 0) {
      this.showError('Playlist has no tracks to play.');
      return;
    }

    const items = pl.tracks.map(t => ({
      id: t.id,
      title: t.title,
      uploaderName: t.uploader,
      thumbnails: [{ url: t.thumbnail }],
      durationText: t.durationText,
      platform: t.platform || 'youtube'
    }));

    this.queue = items;
    this.queueIndex = 0;
    this.renderQueue();
    this.loadVideo(items[0].id);
    this.showSponsorToast(`Playing playlist "${pl.name}" (${items.length} tracks)`);
  }

  queueAllCustomPlaylist(playlistId = this.activePlaylistId) {
    const pl = this.customPlaylists.find(p => p.id === playlistId);
    if (!pl || !pl.tracks || pl.tracks.length === 0) {
      this.showError('Playlist has no tracks to queue.');
      return;
    }

    const items = pl.tracks.map(t => ({
      id: t.id,
      title: t.title,
      uploaderName: t.uploader,
      thumbnails: [{ url: t.thumbnail }],
      durationText: t.durationText,
      platform: t.platform || 'youtube'
    }));

    this.queue.push(...items);
    this.renderQueue();
    this.showSponsorToast(`Added ${items.length} tracks from "${pl.name}" to Queue`);
  }

  deleteCurrentPlaylist() {
    if (!this.activePlaylistId) return;
    this.deletePlaylist(this.activePlaylistId);
    this.showPlaylistsGrid();
  }

  deletePlaylist(playlistId) {
    const idx = this.customPlaylists.findIndex(p => p.id === playlistId);
    if (idx === -1) return;
    const name = this.customPlaylists[idx].name;
    this.customPlaylists.splice(idx, 1);
    this.saveCustomPlaylists();
    this.showSponsorToast(`Deleted playlist "${name}"`);
    this.renderCustomPlaylists();
  }

  exportPlaylistsJson() {
    const data = JSON.stringify(this.customPlaylists, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zentube_playlists_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showSponsorToast('Exported custom playlists backup');
  }

  importPlaylistsJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          this.customPlaylists = imported;
          this.saveCustomPlaylists();
          this.renderCustomPlaylists();
          this.showSponsorToast(`Successfully imported ${imported.length} playlists`);
        } else {
          this.showError('Invalid playlists file format.');
        }
      } catch (err) {
        this.showError('Failed to parse playlists file: ' + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // --- 4. A-B REPEAT LOOPER & ADVANCED PLAYBACK CONTROLS ---
  setLoopA() {
    const v = this.mainVideo;
    this.loopA = Math.max(0, v.currentTime);
    const text = document.getElementById('loopAText');
    if (text) text.innerText = `A: ${this.formatTime(this.loopA)}`;
    this.showSponsorToast(`Point A set to ${this.formatTime(this.loopA)}`);
  }

  setLoopB() {
    const v = this.mainVideo;
    this.loopB = Math.max(this.loopA + 0.5, v.currentTime);
    const text = document.getElementById('loopBText');
    if (text) text.innerText = `B: ${this.formatTime(this.loopB)}`;
    this.showSponsorToast(`Point B set to ${this.formatTime(this.loopB)}`);
  }

  toggleLoopAB() {
    if (this.loopB <= this.loopA) {
      this.showError('Please set Point A and Point B first before looping.');
      return;
    }
    this.isLooping = !this.isLooping;
    const btn = document.getElementById('toggleLoopBtn');
    const text = document.getElementById('loopStatusText');
    if (this.isLooping) {
      if (btn) btn.classList.add('active');
      if (text) text.innerText = 'Loop A-B: ON';
      this.showSponsorToast(`A-B Loop Active (${this.formatTime(this.loopA)} - ${this.formatTime(this.loopB)})`);
      if (this.mainVideo.currentTime < this.loopA || this.mainVideo.currentTime > this.loopB) {
        this.mainVideo.currentTime = this.loopA;
        if (this.mainAudio.src) this.mainAudio.currentTime = this.loopA;
      }
    } else {
      if (btn) btn.classList.remove('active');
      if (text) text.innerText = 'Loop A-B: OFF';
      this.showSponsorToast('A-B Loop Disabled');
    }
  }

  setPlaybackSpeed(speed) {
    const rate = parseFloat(speed) || 1.0;
    this.mainVideo.playbackRate = rate;
    if (this.mainAudio) this.mainAudio.playbackRate = rate;

    const select = document.getElementById('playbackSpeedSelect');
    if (select && select.value !== String(rate)) select.value = String(rate);

    document.querySelectorAll('.speed-btn').forEach((btn) => {
      if (parseFloat(btn.dataset.speed) === rate) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.showSponsorToast(`Playback Speed: ${rate}x`);
  }

  async togglePip() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled && this.mainVideo) {
        await this.mainVideo.requestPictureInPicture();
      }
    } catch (err) {
      this.showError('Picture-in-Picture error: ' + err.message);
    }
  }

  openShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'flex';
  }

  closeShortcutsModal() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.style.display = 'none';
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        if (e.key === 'Escape') document.activeElement.blur();
        return;
      }

      const v = this.mainVideo;
      const a = this.mainAudio;

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          if (v) {
            v.currentTime = Math.max(0, v.currentTime - 10);
            if (a && a.src) a.currentTime = v.currentTime;
            this.showSponsorToast('-10s');
          }
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          if (v) {
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
            if (a && a.src) a.currentTime = v.currentTime;
            this.showSponsorToast('+10s');
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (v) {
            v.currentTime = Math.max(0, v.currentTime - 5);
            if (a && a.src) a.currentTime = v.currentTime;
            this.showSponsorToast('-5s');
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (v) {
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 5);
            if (a && a.src) a.currentTime = v.currentTime;
            this.showSponsorToast('+5s');
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (v) {
            v.muted = !v.muted;
            if (a) a.muted = v.muted;
            this.showSponsorToast(v.muted ? 'Muted' : 'Unmuted');
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          if (!document.fullscreenElement) {
            const frame = document.querySelector('.cinematic-player-frame') || v;
            frame.requestFullscreen?.().catch(() => {});
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          this.togglePip();
          break;
        case 't':
        case 'T':
          e.preventDefault();
          this.toggleTheaterMode();
          break;
        case 'a':
        case 'A':
          e.preventDefault();
          this.toggleAmbientMode();
          break;
        case 'q':
        case 'Q':
          e.preventDefault();
          this.toggleAudioOnlyMode();
          break;
        case '[':
          e.preventDefault();
          this.setLoopA();
          break;
        case ']':
          e.preventDefault();
          this.setLoopB();
          break;
        case '\\':
          e.preventDefault();
          this.toggleLoopAB();
          break;
        case '>':
          e.preventDefault();
          this.changeSpeedRelative(0.25);
          break;
        case '<':
          e.preventDefault();
          this.changeSpeedRelative(-0.25);
          break;
        case '/':
          e.preventDefault();
          this.searchInput.focus();
          break;
        case '?':
          e.preventDefault();
          this.openShortcutsModal();
          break;
        case 'Escape':
          this.closeShortcutsModal();
          this.closeNewPlaylistModal();
          this.closeAddToPlaylistModal();
          this.closeDownloadModal();
          this.closeMirrorsModal();
          break;
      }
    });
  }

  changeSpeedRelative(delta) {
    const currentRate = this.mainVideo?.playbackRate || 1.0;
    const newRate = Math.min(3.0, Math.max(0.25, Math.round((currentRate + delta) * 100) / 100));
    this.setPlaybackSpeed(newRate);
  }

  // --- FLAGSHIP ENGINE SUITE: AMBIENT, THEATER & AUDIO SAVER ---
  toggleAmbientMode() {
    this.isAmbientMode = !this.isAmbientMode;
    try {
      localStorage.setItem('zenpipe_ambient_mode', this.isAmbientMode ? 'true' : 'false');
    } catch {}
    const btn = document.getElementById('ambientToggleBtn');
    if (btn) btn.classList.toggle('active', this.isAmbientMode);
    const glow = document.getElementById('playerAmbientGlow');
    if (glow) glow.classList.toggle('disabled', !this.isAmbientMode);

    if (this.isAmbientMode) {
      if (this.mainVideo && !this.mainVideo.paused && !this.mainVideo.ended) {
        this.startAmbientSampler();
      }
      this.showSponsorToast('Atmospheric Ambient Glow: ON');
    } else {
      this.stopAmbientSampler();
      this.showSponsorToast('Atmospheric Ambient Glow: OFF');
    }
  }

  startAmbientSampler() {
    if (!this.isAmbientMode || !this.ambientCanvas || !this.ambientCtx || !this.mainVideo) return;
    this.stopAmbientSampler();
    const glow = document.getElementById('playerAmbientGlow');
    if (glow) glow.classList.remove('disabled');

    const sampleFrame = () => {
      if (!this.isAmbientMode || !this.mainVideo || this.mainVideo.paused || this.mainVideo.ended) {
        this.stopAmbientSampler();
        return;
      }
      try {
        if (this.mainVideo.readyState >= 2) {
          this.ambientCtx.drawImage(this.mainVideo, 0, 0, this.ambientCanvas.width, this.ambientCanvas.height);
        }
      } catch (e) {
        // Cross-origin video canvas security catch
      }
      this.ambientTimer = setTimeout(sampleFrame, 80);
    };

    sampleFrame();
  }

  stopAmbientSampler() {
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  toggleTheaterMode() {
    this.isTheaterMode = !this.isTheaterMode;
    if (this.watchSection) {
      this.watchSection.classList.toggle('theater-mode', this.isTheaterMode);
    }
    const btn = document.getElementById('theaterBtn');
    if (btn) btn.classList.toggle('active', this.isTheaterMode);
    this.showSponsorToast(this.isTheaterMode ? 'Theater Mode (Cinema Width)' : 'Default View');
  }

  toggleAudioOnlyMode() {
    this.isAudioOnlyMode = !this.isAudioOnlyMode;
    const cover = document.getElementById('audioOnlyCover');
    const thumbImg = document.getElementById('audioOnlyThumb');
    const btn = document.getElementById('audioOnlyToggleBtn');
    const btnText = document.getElementById('audioOnlyToggleText');

    if (this.isAudioOnlyMode) {
      if (cover) {
        cover.style.display = 'flex';
        if (thumbImg && this.currentStream) {
          const t = this.currentStream.thumbnails?.[this.currentStream.thumbnails.length - 1]?.url ||
                    this.currentStream.thumbnails?.[0]?.url ||
                    '';
          thumbImg.src = t;
        }
      }
      if (btn) btn.classList.add('active');
      if (btnText) btnText.innerText = 'Data Saver On';
      this.showSponsorToast('Audio-Only Data Saver Active');
    } else {
      if (cover) cover.style.display = 'none';
      if (btn) btn.classList.remove('active');
      if (btnText) btnText.innerText = 'Audio';
      this.showSponsorToast('Video Mode Restored');
    }
  }
}

window.app = new ZenTubeApp();
