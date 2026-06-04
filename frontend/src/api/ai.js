import API from '../api/config'

export const aiAPI = {
  processPDF: (pdfId) => API.post(`/ai/process/${pdfId}`),
  getResult: (id) => API.get(`/ai/result/${id}`),
  getAllResults: () => API.get('/ai/results'),
  deleteResult: (id) => API.delete(`/ai/result/${id}`),
  chatWithMaterial: (id, question) => API.post(`/ai/chat/${id}`, { question }),
}
