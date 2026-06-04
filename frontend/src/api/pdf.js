import API from '../api/config'

export const pdfAPI = {
  upload: (formData) => API.post('/pdf/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  list: () => API.get('/pdf/list'),
  delete: (id) => API.delete(`/pdf/${id}`),
}
