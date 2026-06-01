import { Ticket, CreateTicketForm, TicketStatus } from '@/types';
import { apiClient } from './apiClient';

export const ticketService = {
  async getTickets(params: { page?: number; limit?: number; search?: string; status?: string; priority?: string; serviceType?: string } = {}): Promise<{ data: Ticket[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.priority) queryParams.append('priority', params.priority);
    if (params.serviceType) queryParams.append('serviceType', params.serviceType);

    const res = await apiClient.get<{ success: boolean; data: Ticket[]; pagination: any }>(`/tickets?${queryParams.toString()}`);
    return { data: res.data.data, pagination: res.data.pagination };
  },
  async getTicketById(id: string): Promise<Ticket | null> {
    const res = await apiClient.get<{ success: boolean; data: Ticket }>(`/tickets/${id}`);
    return res.data.data || null;
  },
  async createTicket(data: CreateTicketForm & {
    assignedToId?: string;
    diagnosis?: string;
    solution?: string;
    partsUsed?: string;
    timeSpent?: number;
    eventDate?: string;
    eventTime?: string;
    eventDuration?: number;
    reportedById?: string;
  }): Promise<Ticket> {
    // Mapear campos del frontend a los del backend
    const payload: any = {
      ...data,
      title: data.title,
      description: data.description,
      priority: data.priority,
      serviceType: data.serviceType,
      equipmentId: data.equipmentId,
      assignedToId: data.assignedToId,
      diagnosis: data.diagnosis,
      solution: data.solution,
      partsUsed: data.partsUsed,
      timeSpent: data.timeSpent
    };
    const res = await apiClient.post<{ success: boolean; data: Ticket }>('/tickets', payload);
    return res.data.data;
  },
  async updateTicket(id: string, data: Partial<CreateTicketForm & {
    assignedToId?: string;
    diagnosis?: string;
    solution?: string;
    partsUsed?: string;
    timeSpent?: number;
    eventDate?: string;
    eventTime?: string;
    eventDuration?: number;
    reportedById?: string;
  }>): Promise<Ticket> {
    // Mapear campos del frontend a los del backend
    const payload: any = {
      ...data,
      serviceType: data.serviceType,
      equipmentId: data.equipmentId,
      assignedToId: data.assignedToId,
      diagnosis: data.diagnosis,
      solution: data.solution,
      partsUsed: data.partsUsed,
      timeSpent: data.timeSpent
    };
    const res = await apiClient.put<{ success: boolean; data: Ticket }>(`/tickets/${id}`, payload);
    return res.data.data;
  },
  async deleteTicket(id: string, justification?: string): Promise<void> {
    await apiClient.delete(`/tickets/${id}`, {
      data: { justification }
    });
  },

  async getDeletedTickets(): Promise<any[]> {
    const res = await apiClient.get<{ success: boolean; data: any[] }>('/tickets/deleted/history');
    return res.data.data;
  },

  async generatePdf(id: string): Promise<Blob> {
    const res = await apiClient.get(`/tickets/pdf/${id}`, {
      responseType: 'blob'
    });
    return res.data;
  }
};