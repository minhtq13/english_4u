/** Lower case without Vietnamese accents, so "luyen de" finds "Luyện đề". */
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase()
