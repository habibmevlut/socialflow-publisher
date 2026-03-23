const API_VERSION = "v25.0";

export type InstagramCarouselUploadParams = {
  accessToken: string;
  igUserId: string;
  imageUrls: string[]; // 2-10
  caption?: string | null;
};

async function waitForContainer(
  accessToken: string,
  containerId: string
): Promise<void> {
  const maxAttempts = 24;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const res = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = (await res.json()) as { status_code?: string; error_message?: string };
    const code = data.status_code;
    if (code === "FINISHED" || code === "PUBLISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`Instagram carousel item hatasi: ${code}. ${data.error_message ?? ""}`);
    }
  }
  throw new Error("Instagram carousel isleme zaman asimi");
}

export async function uploadCarouselToInstagram(
  params: InstagramCarouselUploadParams
): Promise<string> {
  const { accessToken, igUserId, imageUrls, caption } = params;
  if (imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error("Carousel 2-10 resim icermeli");
  }

  const childIds: string[] = [];
  for (const imageUrl of imageUrls) {
    const createRes = await fetch(
      `https://graph.instagram.com/${API_VERSION}/${igUserId}/media?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_carousel_item: true,
          media_type: "IMAGE",
          image_url: imageUrl
        })
      }
    );
    const createData = (await createRes.json()) as { id?: string; error?: { message: string } };
    if (createData.error || !createData.id) {
      throw new Error(createData.error?.message ?? "Carousel item olusturulamadi");
    }
    childIds.push(createData.id);
    await waitForContainer(accessToken, createData.id);
  }

  const carouselRes = await fetch(
    `https://graph.instagram.com/${API_VERSION}/${igUserId}/media?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "CAROUSEL",
        children: childIds.join(","),
        caption: (caption ?? "").slice(0, 2200)
      })
    }
  );
  const carouselData = (await carouselRes.json()) as { id?: string; error?: { message: string } };
  if (carouselData.error || !carouselData.id) {
    throw new Error(carouselData.error?.message ?? "Carousel container olusturulamadi");
  }
  await waitForContainer(accessToken, carouselData.id);

  await new Promise((r) => setTimeout(r, 3000));

  const publishRes = await fetch(
    `https://graph.instagram.com/${API_VERSION}/${igUserId}/media_publish?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: carouselData.id })
    }
  );
  const publishData = (await publishRes.json()) as {
    id?: string;
    error?: { message: string };
  };
  if (publishData.error || !publishData.id) {
    throw new Error(publishData.error?.message ?? "Instagram carousel yayinlama hatasi");
  }
  return `https://www.instagram.com/p/${publishData.id}`;
}
