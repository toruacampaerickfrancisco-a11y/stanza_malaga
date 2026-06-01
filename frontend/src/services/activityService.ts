import { Activity, ActivityStatus, ActivityPriority, ActivityVisibility } from '@/types';
import { apiClient } from './apiClient';

export const activityService = {
  async getActivities(params: { status?: string; priority?: string; visibility?: string; from_date?: string; to_date?: string } = {}): Promise<{ data: Activity[]; success: boolean }> {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.visibility) queryParams.append('visibility', params.visibility);
    if (params.from_date) queryParams.append('from_date', params.from_date);
    if (params.to_date) queryParams.append('to_date', params.to_date);

    const res = await apiClient.get<{ success: boolean; data: Activity[] }>(`/activities?${queryParams.toString()}`);
    return res.data;
  },

  async createActivity(data: Partial<Activity> & { participants?: { user_id: string; role?: string }[] }): Promise<{ success: boolean; data: Activity }> {
    const res = await apiClient.post<{ success: boolean; data: Activity }>('/activities', data);
    return res.data;
  },

  async updateActivity(id: string, data: Partial<Activity>): Promise<{ success: boolean; data: Activity }> {
    const res = await apiClient.put<{ success: boolean; data: Activity }>(`/activities/${id}`, data);
    return res.data;
  },

  async deleteActivity(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/activities/${id}`);
    return res.data;
  },

  async addComment(activityId: string, content: string): Promise<{ success: boolean; data: any }> {
    const res = await apiClient.post<{ success: boolean; data: any }>(`/activities/${activityId}/comments`, { content });
    return res.data;
  },

  async uploadFile(fileName: string, fileData: string): Promise<{ success: boolean; url: string; name: string }> {
    const res = await apiClient.post<{ success: boolean; url: string; name: string }>('/activities/upload', { fileName, fileData });
    return res.data;
  }
};
