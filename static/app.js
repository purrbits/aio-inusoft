// Back to top button functionality
window.addEventListener("scroll", function () {
  const backToTopButton = document.getElementById("backToTop");
  if (backToTopButton && window.scrollY > 300) {
    backToTopButton.classList.remove("opacity-0");
  } else if (backToTopButton) {
    backToTopButton.classList.add("opacity-0");
  }
});

const backToTopBtn = document.getElementById("backToTop");
if (backToTopBtn) {
  backToTopBtn.addEventListener("click", function () {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

const downloadForm = document.getElementById("downloadForm");
if (downloadForm) {
  downloadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    getVideoInfo(e);
  });
}

let currentVideoData = null;
let currentVideoUrl = null;
let currentVideoBlobUrl = null;

function isValidTikTokUrl(url) {
  const regex =
    /(https:\/\/(vt|vm)\.tiktok\.com\/[^\s]+|https:\/\/www\.tiktok\.com\/@[\w.-]+\/video\/\d+)/;
  return regex.test(url);
}

function isValidFacebookUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch|fb\.com)\/(share\/r\/|reel\/|video\/|watch\/|\.+\/videos\/).+/;
  return regex.test(url);
}

function isValidInstagramUrl(url) {
  const regex = /^(https?:\/\/)?(www\.)?instagram\.com\/(reel|p|tv|stories)\/[^\s]+/;
  return regex.test(url);
}

function showError(message) {
  const errorMsg = document.getElementById("errorMsg");
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.classList.remove("hidden");
  }

  const loading = document.getElementById("loading");
  if (loading) {
    loading.classList.add("hidden");
  }

  console.error("Error:", message);
}

function showLoading(show) {
  const loading = document.getElementById("loading");
  if (loading) {
    if (show) {
      loading.classList.remove("hidden");
    } else {
      loading.classList.add("hidden");
    }
  }
}

function enableDownloadButton(enable) {
  const downloadBtn = document.getElementById("downloadBtn");
  if (downloadBtn) {
    if (enable) {
      downloadBtn.disabled = false;
      downloadBtn.classList.remove("bg-gray-400", "cursor-not-allowed");
      downloadBtn.classList.add("bg-button-pink", "hover:bg-red-600", "cursor-pointer");
    } else {
      downloadBtn.disabled = true;
      downloadBtn.classList.remove("bg-button-pink", "hover:bg-red-600", "cursor-pointer");
      downloadBtn.classList.add("bg-gray-400", "cursor-not-allowed");
    }
  }
}

function getVideoInfo(event) {
  event.preventDefault();
  
  const url = document.getElementById('urlInput').value.trim();
  const errorMsg = document.getElementById('errorMsg');
  const result = document.getElementById('result');
  
  if (errorMsg) errorMsg.classList.add('hidden');
  if (result) result.classList.add('hidden');
  showLoading(true);
  
  enableDownloadButton(true);
  
  // Validate URL
  if (!isValidTikTokUrl(url) && !isValidFacebookUrl(url) && !isValidInstagramUrl(url)) {
    showError('URL tidak valid. Harus berupa URL TikTok, Instagram atau Facebook.');
    return;
  }
  
  fetch('/info', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'url=' + encodeURIComponent(url)
  })
  .then(response => {
      if (!response.ok) {
          return response.json().then(errorData => {
              throw new Error(errorData.error || `Server error: ${response.status}`);
          });
      }
      return response.json();
  })
  .then(data => {
    if (data.error) {
      throw new Error(data.error);
    }
    
    showLoading(false);
    
    currentVideoData = data;
    currentVideoUrl = url;
    
    displayVideoInfo(data);
    
    return fetch('/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'url=' + encodeURIComponent(url)
    });
  })
  .then(response => {
    if (!response) return;
    
    if (response.ok) {
      return response.blob();
    } else {
      return response.json().then(errorData => {
        throw new Error(errorData.error || 'Gagal mengunduh video');
      });
    }
  })
  .then(blob => {
    if (!blob) return;
    
    if (currentVideoBlobUrl) {
      URL.revokeObjectURL(currentVideoBlobUrl);
    }
    currentVideoBlobUrl = URL.createObjectURL(blob);
    
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
      videoPlayer.src = currentVideoBlobUrl;
      videoPlayer.classList.remove('hidden');
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.classList.remove('hidden');
      downloadBtn.onclick = function() {
        downloadVideo(currentVideoBlobUrl);
        // Nonaktifkan tombol setelah diklik
        enableDownloadButton(false);
      };
    }
  })
  .catch(error => {
    showLoading(false);
    showError('Terjadi kesalahan: ' + error.message);
  });
}

function displayVideoInfo(videoData) {
  const result = document.getElementById('result');
  if (!result) return;
  
  const videoTitle = document.getElementById('videoTitle');
  if (videoTitle && videoData.title) {
    videoTitle.textContent = videoData.title;
  }
  
  const videoAuthor = document.getElementById('videoAuthor');
  if (videoAuthor && videoData.author) {
    videoAuthor.textContent = videoData.author;
  }
  
  const videoDuration = document.getElementById('videoDuration');
  if (videoDuration) {
    if (videoData.duration) {
      videoDuration.textContent = formatDuration(videoData.duration);
      const durationContainer = videoDuration.closest('.flex.items-center, .info-item, p');
      if (durationContainer) {
        durationContainer.classList.remove('hidden');
      }
    } else {
      const durationContainer = videoDuration.closest('.flex.items-center, .info-item, p');
      if (durationContainer) {
        durationContainer.classList.add('hidden');
      }
    }
  }
  
  const videoViews = document.getElementById('videoViews');
  if (videoViews) {
    if (videoData.views) {
      videoViews.textContent = formatCount(videoData.views);
      const viewsContainer = videoViews.closest('.flex.items-center, .info-item, p');
      if (viewsContainer) {
        viewsContainer.classList.remove('hidden');
      }
    } else {
      const viewsContainer = videoViews.closest('.flex.items-center, .info-item, p');
      if (viewsContainer) {
        viewsContainer.classList.add('hidden');
      }
    }
  }
  
  const videoLikes = document.getElementById('videoLikes');
  if (videoLikes) {
    if (videoData.likes) {
      videoLikes.textContent = formatCount(videoData.likes);
      const likesContainer = videoLikes.closest('.flex.items-center, .info-item, p');
      if (likesContainer) {
        likesContainer.classList.remove('hidden');
      }
    } else {
      const likesContainer = videoLikes.closest('.flex.items-center, .info-item, p');
      if (likesContainer) {
        likesContainer.classList.add('hidden');
      }
    }
  }
  
  const videoComments = document.getElementById('videoComments');
  if (videoComments) {
    if (videoData.comments) {
      videoComments.textContent = formatCount(videoData.comments);
      const commentsContainer = videoComments.closest('.flex.items-center, .info-item, p');
      if (commentsContainer) {
        commentsContainer.classList.remove('hidden');
      }
    } else {
      const commentsContainer = videoComments.closest('.flex.items-center, .info-item, p');
      if (commentsContainer) {
        commentsContainer.classList.add('hidden');
      }
    }
  }
  
  const videoShares = document.getElementById('videoShares');
  if (videoShares) {
    if (videoData.shares) {
      videoShares.textContent = formatCount(videoData.shares);
      const sharesContainer = videoShares.closest('.flex.items-center, .info-item, p');
      if (sharesContainer) {
        sharesContainer.classList.remove('hidden');
      }
    } else {
      const sharesContainer = videoShares.closest('.flex.items-center, .info-item, p');
      if (sharesContainer) {
        sharesContainer.classList.add('hidden');
      }
    }
  }
  
  const videoDownloads = document.getElementById('videoDownloads');
  if (videoDownloads) {
    if (videoData.downloads) {
      videoDownloads.textContent = formatCount(videoData.downloads);
      const downloadsContainer = videoDownloads.closest('.flex.items-center, .info-item, p');
      if (downloadsContainer) {
        downloadsContainer.classList.remove('hidden');
      }
    } else {
      const downloadsContainer = videoDownloads.closest('.flex.items-center, .info-item, p');
      if (downloadsContainer) {
        downloadsContainer.classList.add('hidden');
      }
    }
  }
  
  const authorAvatar = document.getElementById('authorAvatar');
  if (authorAvatar) {
    if (videoData.thumbnail) {
      authorAvatar.src = videoData.thumbnail;
      authorAvatar.classList.remove('hidden');
    } else {
      authorAvatar.classList.add('hidden');
    }
  }
  
  const platformBadge = document.getElementById('platformBadge');
  if (platformBadge) {
    if (videoData.platform) {
      platformBadge.textContent = videoData.platform === 'tiktok' ? 'TikTok' : 'Facebook';
      platformBadge.classList.remove('hidden');
    } else {
      platformBadge.classList.add('hidden');
    }
  }
  
  result.classList.remove('hidden');
  
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function downloadVideo(videoUrl) {
  const randomNum = Math.floor(Math.random() * 90000) + 10000;
  const filename = `inusoft-${randomNum}.mp4`;
  
  const a = document.createElement('a');
  a.href = videoUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
}

function formatCount(count) {
  if (!count) return "0";
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + "M";
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + "K";
  }
  return count.toString();
}