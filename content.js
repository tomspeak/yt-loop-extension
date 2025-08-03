class YouTubeLooper {
  constructor() {
    this.video = null;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.isLooping = false;
    this.loopInterval = null;
    this.init();
  }

  init() {
    this.waitForVideo();
  }

  waitForVideo() {
    const checkForVideo = () => {
      const video = document.querySelector('video');
      if (video && video !== this.video) {
        this.video = video;
        this.setupLoopControls();
      }
    };

    const observer = new MutationObserver(checkForVideo);
    observer.observe(document.body, { childList: true, subtree: true });
    checkForVideo();
  }

  setupLoopControls() {
    if (!this.video || document.querySelector('.yt-loop-controls')) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'yt-loop-controls';
    
    const rangeSlider = document.createElement('div');
    rangeSlider.className = 'yt-range-slider';
    
    const rangeTrack = document.createElement('div');
    rangeTrack.className = 'yt-range-track';
    
    const rangeProgress = document.createElement('div');
    rangeProgress.className = 'yt-range-progress';
    
    const startThumb = document.createElement('div');
    startThumb.className = 'yt-range-thumb yt-range-thumb-start';
    startThumb.setAttribute('data-value', '0');
    
    const startTooltip = document.createElement('div');
    startTooltip.className = 'yt-range-tooltip';
    startThumb.appendChild(startTooltip);
    
    const endThumb = document.createElement('div');
    endThumb.className = 'yt-range-thumb yt-range-thumb-end';
    endThumb.setAttribute('data-value', this.getSliderSteps());
    
    const endTooltip = document.createElement('div');
    endTooltip.className = 'yt-range-tooltip';
    endThumb.appendChild(endTooltip);
    
    rangeTrack.appendChild(rangeProgress);
    rangeTrack.appendChild(startThumb);
    rangeTrack.appendChild(endThumb);
    rangeSlider.appendChild(rangeTrack);
    
    controlsContainer.appendChild(rangeSlider);
    
    // Try multiple insertion points in order of preference
    const insertionPoints = [
      () => {
        const title = document.querySelector('#title');
        if (title && title.parentElement) {
          title.parentElement.insertBefore(controlsContainer, title);
          return true;
        }
        return false;
      },
      () => {
        const watchMetadata = document.querySelector('ytd-watch-metadata');
        if (watchMetadata) {
          watchMetadata.insertBefore(controlsContainer, watchMetadata.firstChild);
          return true;
        }
        return false;
      },
      () => {
        const primaryInner = document.querySelector('#primary-inner');
        if (primaryInner && primaryInner.parentElement) {
          primaryInner.parentElement.insertBefore(controlsContainer, primaryInner);
          return true;
        }
        return false;
      },
      () => {
        // Last resort - after video player
        const player = document.querySelector('#movie_player');
        if (player && player.parentElement) {
          player.parentElement.insertBefore(controlsContainer, player.nextSibling);
          return true;
        }
        return false;
      }
    ];

    // Try each insertion point until one works
    for (const tryInsert of insertionPoints) {
      if (tryInsert()) break;
    }
    
    this.setupEventListeners(rangeSlider, startThumb, endThumb);
  }

  getSliderSteps() {
    if (!this.video || !this.video.duration) return 100;
    
    const duration = this.video.duration;
    // More granular step calculation based on video length
    if (duration <= 120) { // <= 2 minutes: 0.5 second steps
      return Math.floor(duration * 2);
    } else if (duration <= 600) { // <= 10 minutes: 1 second steps
      return Math.floor(duration);
    } else if (duration <= 1800) { // <= 30 minutes: 2 second steps  
      return Math.floor(duration / 2);
    } else if (duration <= 3600) { // <= 1 hour: 5 second steps
      return Math.floor(duration / 5);
    } else { // > 1 hour: 10 second steps
      return Math.floor(duration / 10);
    }
  }

  getStepSize() {
    if (!this.video || !this.video.duration) return 1;
    
    const duration = this.video.duration;
    if (duration <= 120) return 0.5; // 0.5 second
    else if (duration <= 600) return 1; // 1 second
    else if (duration <= 1800) return 2; // 2 seconds
    else if (duration <= 3600) return 5; // 5 seconds
    else return 10; // 10 seconds
  }

  setupEventListeners(rangeSlider, startThumb, endThumb) {
    let isDragging = false;
    let activeThumb = null;
    let maxSteps = this.getSliderSteps();

    let updateTimeFrame = null;
    const updateTime = () => {
      if (updateTimeFrame) return; // Skip if already scheduled
      
      updateTimeFrame = requestAnimationFrame(() => {
        if (!this.video) {
          updateTimeFrame = null;
          return;
        }
        
        const stepSize = this.getStepSize();
        const startValue = parseInt(startThumb.getAttribute('data-value'));
        const endValue = parseInt(endThumb.getAttribute('data-value'));
        const startTime = startValue * stepSize;
        const endTime = endValue * stepSize;
        
        this.loopStart = startTime;
        this.loopEnd = endTime;
        
        this.updateRangeVisual(rangeSlider, startValue, endValue, maxSteps);
        
        // Update tooltips
        const startTooltip = startThumb.querySelector('.yt-range-tooltip');
        const endTooltip = endThumb.querySelector('.yt-range-tooltip');
        if (startTooltip) startTooltip.textContent = this.formatTime(startTime);
        if (endTooltip) endTooltip.textContent = this.formatTime(endTime);
        
        // Auto-enable loop if user has set a custom range (not 0 to max)
        const hasCustomRange = startValue > 0 || endValue < maxSteps;
        if (hasCustomRange && !this.isLooping) {
          this.startLoop();
        } else if (!hasCustomRange && this.isLooping) {
          this.stopLoop();
        }
        
        updateTimeFrame = null;
      });
    };

    const getValueFromPosition = (clientX, trackRect) => {
      const percent = Math.max(0, Math.min(1, (clientX - trackRect.left) / trackRect.width));
      return Math.round(percent * maxSteps);
    };

    const handleStart = (e, thumb) => {
      isDragging = true;
      activeThumb = thumb;
      e.preventDefault();
    };

    const handleMove = (e) => {
      if (!isDragging || !activeThumb) return;
      
      const track = rangeSlider.querySelector('.yt-range-track');
      const trackRect = track.getBoundingClientRect();
      const newValue = getValueFromPosition(e.clientX, trackRect);
      
      const startValue = parseInt(startThumb.getAttribute('data-value'));
      const endValue = parseInt(endThumb.getAttribute('data-value'));
      
      if (activeThumb === startThumb) {
        const clampedValue = Math.min(newValue, endValue - 1);
        startThumb.setAttribute('data-value', Math.max(0, clampedValue));
      } else {
        const clampedValue = Math.max(newValue, startValue + 1);
        endThumb.setAttribute('data-value', Math.min(maxSteps, clampedValue));
      }
      
      updateTime();
    };

    const handleEnd = () => {
      isDragging = false;
      activeThumb = null;
    };

    startThumb.addEventListener('mousedown', (e) => handleStart(e, startThumb));
    endThumb.addEventListener('mousedown', (e) => handleStart(e, endThumb));
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);

    // Touch events
    startThumb.addEventListener('touchstart', (e) => handleStart(e.touches[0], startThumb));
    endThumb.addEventListener('touchstart', (e) => handleStart(e.touches[0], endThumb));
    document.addEventListener('touchmove', (e) => {
      if (isDragging) handleMove(e.touches[0]);
    });
    document.addEventListener('touchend', handleEnd);
    
    this.video.addEventListener('loadedmetadata', () => {
      maxSteps = this.getSliderSteps();
      endThumb.setAttribute('data-value', maxSteps);
      updateTime();
    });
    this.video.addEventListener('durationchange', () => {
      maxSteps = this.getSliderSteps();
      endThumb.setAttribute('data-value', maxSteps);
      updateTime();
    });
    
    updateTime();
  }

  findInsertLocation() {
    // Find the video player and insert controls directly after it
    const player = document.querySelector('#movie_player');
    if (player) {
      // Find the player's container that we can insert after
      const playerContainer = player.closest('#player-container-outer, #player-container, #player, .html5-video-player') || player;
      return playerContainer.nextElementSibling || playerContainer.parentElement;
    }
    
    // Fallback selectors if player not found
    const fallbacks = [
      '#player-container-outer',
      '#player-container', 
      '#player',
      '#primary-inner',
      '#columns'
    ];
    
    for (const selector of fallbacks) {
      const element = document.querySelector(selector);
      if (element) {
        return element.nextElementSibling || element.parentElement;
      }
    }
    
    return document.body;
  }

  updateRangeVisual(rangeSlider, startValue, endValue, maxSteps) {
    const track = rangeSlider.querySelector('.yt-range-track');
    const progress = rangeSlider.querySelector('.yt-range-progress');
    const startThumb = rangeSlider.querySelector('.yt-range-thumb-start');
    const endThumb = rangeSlider.querySelector('.yt-range-thumb-end');
    
    const startPercent = (startValue / maxSteps) * 100;
    const endPercent = (endValue / maxSteps) * 100;
    
    progress.style.left = `${startPercent}%`;
    progress.style.width = `${endPercent - startPercent}%`;
    
    startThumb.style.left = `${startPercent}%`;
    endThumb.style.left = `${endPercent}%`;
  }


  startLoop() {
    if (!this.video) return;
    
    this.isLooping = true;
    
    this.loopInterval = setInterval(() => {
      if (this.video.currentTime >= this.loopEnd) {
        this.video.currentTime = this.loopStart;
      }
    }, 100);
  }

  stopLoop() {
    this.isLooping = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

new YouTubeLooper();