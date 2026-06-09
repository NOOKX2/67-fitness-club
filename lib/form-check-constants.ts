export const MAX_FORM_CHECK_VIDEO_MB = 50;
export const MAX_FORM_CHECK_VIDEO_BYTES = MAX_FORM_CHECK_VIDEO_MB * 1024 * 1024;

export function formCheckVideoStreamPath(id: string, admin = true): string {
  return admin
    ? `/api/admin/form-checks/${id}/stream`
    : `/api/form-checks/${id}/stream`;
}
