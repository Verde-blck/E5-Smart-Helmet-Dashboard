/**
 * The operator's microphone, and camera if wanted. With no camera on the
 * computer, carries on with the microphone alone rather than failing.
 */
export async function getLocalMedia(
  withCamera: boolean
): Promise<{ stream: MediaStream; noCamera: boolean }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      'This browser can’t use the camera or microphone here. It needs the dashboard on https:// (or localhost).'
    )
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withCamera ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
    })
    return { stream, noCamera: false }
  } catch (error) {
    const name = (error as DOMException)?.name
    if (withCamera && (name === 'NotFoundError' || name === 'OverconstrainedError')) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      return { stream, noCamera: true }
    }
    throw error
  }
}
