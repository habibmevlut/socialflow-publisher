    # TikTok App Review - Reviewer Instructions

    Copy the content below into the "Reviewer Instructions" / "Provide reviewer instructions" field in TikTok Developer Portal when resubmitting your app.

    ---

    ## How TikTok Products and Scopes Work in Socialflow Publisher

    ### Login Kit (OAuth)
    **Purpose:** Connect the user's TikTok account to our application so we can publish videos on their behalf.

    **Flow:**
    1. User clicks "TikTok Bağla" (Connect TikTok) on our dashboard.
    2. User is redirected to TikTok's authorization page.
    3. User grants permission for our app to access their account.
    4. User is redirected back to our dashboard with their account connected.

    **Scopes used:**
    - `user.info.basic` – Required to identify the user (display name, open_id) when they connect their account.
    - `video.publish` – Required to publish videos to the user's TikTok account via the Content Posting API.

    ### Content Posting API (video.publish)
    **Purpose:** Allow users to upload a video from our dashboard and publish it directly to their TikTok account.

    **Flow:**
    1. User uploads a video file or provides a video URL on our dashboard.
    2. User selects their connected TikTok account as a publishing target.
    3. User clicks "Yayınla" (Publish).
    4. Our backend uses the Content Posting API with FILE_UPLOAD to transfer the video to TikTok and publish it to the user's account.
    5. The video appears in the user's TikTok account (subject to their privacy settings).

    **Why we need video.publish:** Without this scope, we cannot publish videos to the user's TikTok account. The user explicitly requests this action when they choose to publish content to TikTok from our multi-platform publishing dashboard.

    ---

    ## Website URL
    Our production website: https://socialflow-publisher.vercel.app

    This URL points to our **fully developed application** – a content management dashboard where users can:
    - Connect YouTube, Instagram, TikTok, and Facebook accounts
    - Upload videos
    - Create posts and publish to selected platforms
    - View post status and manage connected accounts

    The homepage is the main dashboard, not a login page or landing page. There is no login required for the demo; users can access the dashboard directly.

    ---

    ## App Description (120 char limit - paste into Basic Information)
    Socialflow Publisher lets creators upload videos and publish to YouTube, Instagram, TikTok, and Facebook from one dashboard.

    ---

    ## Test Account (if required)
    If the reviewer needs a test account to access the app, provide:
    - [Add your test TikTok account email/username here]
    - [Add any demo credentials if your app has auth]

    ---

    ## Privacy Policy and Terms of Service
    - **Privacy Policy:** https://socialflow-publisher.vercel.app/privacy
    - **Terms of Service:** https://socialflow-publisher.vercel.app/terms
