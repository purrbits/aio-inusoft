import os
import re
import tempfile
import random
import requests
import time
import urllib
from flask import Flask, request, send_file, jsonify, render_template
from flask_cors import CORS
import yt_dlp

app = Flask(__name__)
CORS(app)

INSTAGRAM_COOKIES = "cookies.txt"

ydl_opts = {
    'quiet': True,
    'no_warnings': True,
    'format': 'best',
}

start_time = time.time()

def is_valid_tiktok_url(url):
    """Validasi URL TikTok"""
    tiktok_pattern = r'^(https?://)?(www\.)?(vm\.|vt\.|tiktok\.com/@.+/video/|tiktok\.com/t/).+'
    return re.match(tiktok_pattern, url) is not None

def is_valid_facebook_url(url):
    pattern = r'^(https?://)?(www\.)?(facebook\.com|fb\.com|fb\.watch)/.+'
    return re.match(pattern, url) is not None

def is_valid_instagram_url(url):
    """Validasi URL Instagram"""
    instagram_pattern = r'^(https?://)?(www\.)?(instagram\.com|instagr\.am)/(p|reel|stories)/[^/]+/?.*'
    return re.match(instagram_pattern, url) is not None

def get_video_info_from_purrbits(url):
    try:
        encoded_url = requests.utils.quote(url)
        api_url = f'https://purrbits.lick.eu.org/api/v1/tiktok?url={encoded_url}'
        
        response = requests.get(api_url, headers={'accept': 'application/json'}, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 200:
                return data
        return None
    except Exception as e:
        print(f"Error getting info from PurrBits: {str(e)}")
        return None

def parse_facebook_info(title_string):
    try:
        # Pisah berdasarkan karakter pipe
        parts = [part.strip() for part in title_string.split('|') if part.strip()]
        
        if len(parts) >= 3:
            stats_part = parts[0]
            video_title = parts[1]
            author = parts[2]
            
            views_match = re.search(r'(\d+\.?\d*[KMB]?)\s*views', stats_part)
            views = views_match.group(1) if views_match else "0"
            
            reactions_match = re.search(r'(\d+\.?\d*[KMB]?)\s*reactions', stats_part)
            reactions = reactions_match.group(1) if reactions_match else "0"
            
            return {
                'title': video_title,
                'author': author,
                'views': views,
                'reactions': reactions
            }
        else:
            return {
                'title': title_string,
                'author': 'Unknown',
                'views': '0',
                'reactions': '0'
            }
    except Exception as e:
        print(f"Error parsing Facebook info: {str(e)}")
        return {
            'title': title_string,
            'author': 'Unknown',
            'views': '0',
            'reactions': '0'
        }

def clean_instagram_title(title):
    """Bersihkan title Instagram dengan menghapus 'Video by' dan sejenisnya"""
    if not title:
        return "Instagram Video"
    
    cleaned_title = re.sub(r'^(Video|Reel)\s+by\s+@?\w+\s*[-:]*\s*', '', title, flags=re.IGNORECASE)
    
    if not cleaned_title.strip():
        return "Instagram Video"
    
    return cleaned_title.strip()

def download_video(url):
    temp_dir = tempfile.gettempdir()
    platform = None
    filename = None

    if is_valid_tiktok_url(url):
        platform = 'tiktok'
        filename = f"tiktok-{random.randint(10000, 99999)}.mp4"
    elif is_valid_facebook_url(url):
        platform = 'facebook'
        filename = f"facebook-{random.randint(10000, 99999)}.mp4"
    elif is_valid_instagram_url(url):
        platform = 'instagram'
        filename = f"instagram-{random.randint(10000, 99999)}.mp4"
    else:
        return None, {'error': 'URL tidak didukung'}

    file_path = os.path.join(temp_dir, filename)

    opts = ydl_opts.copy()
    opts['outtmpl'] = file_path

    if is_valid_instagram_url(url) and os.path.exists(INSTAGRAM_COOKIES):
        opts['cookiefile'] = INSTAGRAM_COOKIES
        opts['merge_output_format'] = 'mp4'
        opts['format'] = 'bv*[ext=mp4][vcodec^=avc1]+ba[ext=m4a]/mp4'

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            
            if is_valid_instagram_url(url):
                title = clean_instagram_title(info.get('title', ''))
                metadata = {
                    'title': title,
                    'author': title,
                    'views': str(info.get('view_count', 0)),
                    'likes': str(info.get('like_count', 0)),
                    'video_id': info.get('id', '')
                }
            else:
                metadata = {
                    'title': info.get('title', 'Video'),
                    'author': info.get('uploader', 'Unknown'),
                    'views': str(info.get('view_count', 0)),
                    'reactions': str(info.get('like_count', 0)),
                    'video_id': info.get('id', '')
                }

            return file_path, metadata
    except Exception as e:
        print(f"Error downloading video: {str(e)}")
        return None, {'error': str(e)}

def get_video_info(url):
    """Mendapatkan informasi video berdasarkan platform"""
    if is_valid_tiktok_url(url):
        video_info = get_video_info_from_purrbits(url)
        if video_info:
            return {
                'status': 200,
                'title': video_info.get('metadata', {}).get('title', 'TikTok Video'),
                'author': video_info.get('author', {}).get('nickname', 'Unknown'),
                'duration': video_info.get('metadata', {}).get('durasi', 0),
                'views': video_info.get('metadata', {}).get('view', 0),
                'likes': video_info.get('metadata', {}).get('view', 0),
                'comments': video_info.get('metadata', {}).get('comment', 0),
                'shares': video_info.get('metadata', {}).get('share', 0),
                'downloads': video_info.get('metadata', {}).get('download', 0),
                'thumbnail': video_info.get('author', {}).get('avatar', ''),
                'video_url': video_info.get('media', {}).get('play', ''),
                'platform': 'tiktok'
            }
        else:
            return {'error': 'Gagal mendapatkan informasi video TikTok'}
    
    elif is_valid_facebook_url(url):
        file_path, metadata = download_video(url)
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
            
            title_string = metadata.get('title', '')
            fb_info = parse_facebook_info(title_string)
            
            return {
                'status': 200,
                'title': fb_info['title'],
                'author': fb_info['author'],
                'views': fb_info['views'],
                'likes': fb_info['reactions'],
                'platform': 'facebook'
            }
        else:
            return {'error': metadata.get('error', 'Gagal mendapatkan informasi video Facebook')}
    
    elif is_valid_instagram_url(url):
        try:
            opts = ydl_opts.copy()
            if os.path.exists(INSTAGRAM_COOKIES):
                opts['cookiefile'] = INSTAGRAM_COOKIES
            
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                title = clean_instagram_title(info.get('title', ''))
                
                return {
                    'status': 200,
                    'title': title,
                    'author': info.get('uploader', 'Unknown'),
                    'views': str(info.get('view_count', 0)),
                    'likes': str(info.get('like_count', 0)),
                    'platform': 'instagram'
                }
        except Exception as e:
            print(f"Error getting Instagram info: {str(e)}")
            return {
                'status': 200,
                'title': 'Instagram Video',
                'author': 'Unknown',
                'views': '0',
                'likes': '0',
                'platform': 'instagram',
                'warning': 'Info terbatas, cookies mungkin diperlukan'
            }
    
    else:
        return {'error': 'URL tidak didukung'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/terms-of-service')
def tos_privacy():
    return render_template('tos-privacy.html')

@app.route('/info', methods=['POST'])
def api_get_video_info():
    url = request.form.get('url')
    print(f"Received URL: {url}")
    
    if not url:
        return jsonify({'error': 'URL tidak boleh kosong'}), 400
    
    print(f"is_valid_tiktok_url: {is_valid_tiktok_url(url)}")
    print(f"is_valid_facebook_url: {is_valid_facebook_url(url)}")
    print(f"is_valid_instagram_url: {is_valid_instagram_url(url)}")
    
    if not is_valid_tiktok_url(url) and not is_valid_facebook_url(url) and not is_valid_instagram_url(url):
        print("URL not supported by any pattern")
        return jsonify({'error': 'URL tidak didukung'}), 400
    
    video_info = get_video_info(url)
    print(f"Video info result: {video_info}")
    
    if 'error' in video_info:
        return jsonify({'error': video_info['error']}), 500
    else:
        return jsonify(video_info)

@app.route('/download', methods=['POST'])
def api_download():
    url = request.form.get('url')
    
    if not url:
        return jsonify({'error': 'URL tidak boleh kosong'}), 400
    
    file_path, metadata = download_video(url)
    
    if file_path and os.path.exists(file_path):
        if is_valid_tiktok_url(url):
            download_name = f"tiktok-video-{random.randint(10000, 99999)}.mp4"
        elif is_valid_facebook_url(url):
            download_name = f"facebook-video-{random.randint(10000, 99999)}.mp4"
        elif is_valid_instagram_url(url):
            download_name = f"instagram-{random.randint(10000, 99999)}.mp4"
        else:
            download_name = os.path.basename(file_path)
        
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=download_name,
            mimetype='video/mp4'
        )
        
        # Hapus file setelah dikirim (opsional)
        # try:
        #     os.remove(file_path)
        # except:
        #     pass
            
        return response
    else:
        error_msg = metadata.get('error', 'Gagal mengunduh video')
        return jsonify({'error': error_msg}), 500

@app.route('/uptime')
def uptime():
    """Cek uptime dan status server"""
    uptime_seconds = int(time.time() - start_time)
    return jsonify({
        'status': 'ok',
        'uptime_seconds': uptime_seconds,
        'uptime_human': f"{uptime_seconds // 3600}h {(uptime_seconds % 3600) // 60}m {uptime_seconds % 60}s"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)