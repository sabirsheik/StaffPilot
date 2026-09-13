import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectApi, notificationApi } from '../api/endpoints';
import { extractErrorMessage } from '../lib/axios';
import { useAuth } from '../context/AuthContext';

export const useProjects = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['projects', params],
    queryFn: async () => {
      const res = await projectApi.getProjects(params);
      return res;
    },
    enabled: isAuthenticated,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useProject = (id, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await projectApi.getProjectById(id);
      return res?.data || null;
    },
    enabled: Boolean(isAuthenticated && id),
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useProjectAnalytics = (options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['project-analytics'],
    queryFn: async () => {
      const res = await projectApi.getAnalytics();
      return res?.data || null;
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCreateProjectMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await projectApi.createProject(payload);
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-analytics'] });
      toast.success(options.successMessage || 'Project created successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to create project.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useUpdateProjectMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await projectApi.updateProject(id, payload);
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['project-analytics'] });
      toast.success(options.successMessage || 'Project updated successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update project.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useDeleteProjectMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await projectApi.deleteProject(id);
      return res;
    },
    onSuccess: (data, id, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-analytics'] });
      toast.success(options.successMessage || 'Project archived successfully.');
      options.onSuccess?.(data, id, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to delete project.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useAddRemarkMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }) => {
      const res = await projectApi.addRemark(id, { content });
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['project-analytics'] });
      toast.success(options.successMessage || 'Remark added.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to add remark.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useEditRemarkMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, remarkId, content }) => {
      const res = await projectApi.editRemark(id, remarkId, { content });
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['project-analytics'] });
      toast.success(options.successMessage || 'Remark updated.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update remark.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useUploadProjectFileMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }) => {
      const res = await projectApi.uploadFile(id, file);
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', vars.id] });
      toast.success(options.successMessage || 'File uploaded.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to upload file.'));
      options.onError?.(err);
    },
    ...options,
  });
};
