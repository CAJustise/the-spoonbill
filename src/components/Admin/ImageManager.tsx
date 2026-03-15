import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Upload, X, Image as ImageIcon, Copy, Check, Filter, Edit2 } from 'lucide-react';

interface ImageMetadata {
  id: string;
  storage_id: string;
  display_name: string;
  category_id: string | null;
  description: string | null;
  url: string;
  category?: {
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
}

const ImageManager: React.FC = () => {
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isMetadataFormOpen, setIsMetadataFormOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageMetadata | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('image_categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch images with metadata
      const { data: storageData, error: storageError } = await supabase.storage
        .from('images')
        .list('');

      if (storageError) throw storageError;

      const { data: metadataData, error: metadataError } = await supabase
        .from('image_metadata')
        .select(`
          *,
          category:category_id (name)
        `);

      if (metadataError) throw metadataError;

      const imageUrls = await Promise.all(
        storageData.map(async (file) => {
          const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(file.name);
          
          const metadata = metadataData?.find(m => m.storage_id === file.name) || {
            storage_id: file.name,
            display_name: file.name,
            category_id: null,
            description: null
          };

          return {
            ...metadata,
            url: publicUrl
          };
        })
      );

      setImages(imageUrls);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching data: ' + (error as Error).message);
    }
  };

  const uploadImages = async (files: FileList) => {
    try {
      setUploading(true);
      setUploadProgress({});

      // Process files in batches of 3 to avoid overwhelming the system
      const batchSize = 3;
      const fileArray = Array.from(files);
      
      for (let i = 0; i < fileArray.length; i += batchSize) {
        const batch = fileArray.slice(i, i + batchSize);
        await Promise.all(batch.map(async (file) => {
          try {
            // Create a unique file name
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

            // Upload file
            const { error: uploadError } = await supabase.storage
              .from('images')
              .upload(fileName, file, {
                onUploadProgress: (progress) => {
                  setUploadProgress(prev => ({
                    ...prev,
                    [file.name]: Math.round((progress.loaded / progress.total) * 100)
                  }));
                }
              });

            if (uploadError) throw uploadError;

            // Create metadata entry
            const { error: metadataError } = await supabase
              .from('image_metadata')
              .insert([{
                storage_id: fileName,
                display_name: file.name.split('.')[0], // Use original filename without extension
                category_id: null
              }]);

            if (metadataError) throw metadataError;

          } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            // Continue with other files even if one fails
          }
        }));
      }

      await fetchData();
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Error uploading images: ' + (error as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const files = Array.from(e.target.files);
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const maxSize = 25 * 1024 * 1024; // 25MB total limit

    if (totalSize > maxSize) {
      alert('Total file size must be less than 25MB');
      return;
    }

    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert(`The following files exceed the 5MB limit:\n${invalidFiles.map(f => f.name).join('\n')}`);
      return;
    }

    await uploadImages(e.target.files);
  };

  const handleDeleteImage = async (image: ImageMetadata) => {
    if (!confirm('Are you sure you want to delete this image?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([image.storage_id]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('image_metadata')
        .delete()
        .eq('storage_id', image.storage_id);

      if (metadataError) throw metadataError;

      await fetchData();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image: ' + (error as Error).message);
    }
  };

  const handleUpdateMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingImage) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const { error } = await supabase
        .from('image_metadata')
        .upsert({
          storage_id: editingImage.storage_id,
          display_name: formData.get('display_name') as string,
          category_id: formData.get('category_id') as string || null,
          description: formData.get('description') as string
        });

      if (error) throw error;

      await fetchData();
      setIsMetadataFormOpen(false);
      setEditingImage(null);
    } catch (error) {
      console.error('Error updating metadata:', error);
      alert('Error updating metadata: ' + (error as Error).message);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const filteredImages = selectedCategory
    ? images.filter(img => img.category_id === selectedCategory)
    : images;

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display font-bold text-gray-900">Image Manager</h1>
          <label className="cursor-pointer bg-ocean-600 text-white px-6 py-3 rounded-lg hover:bg-ocean-700 transition-colors inline-flex items-center">
            <Upload className="h-5 w-5 mr-2" />
            Upload Images
            <input
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-ocean-500 focus:border-ocean-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Progress */}
        {uploading && Object.keys(uploadProgress).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Uploading Images...</h3>
            <div className="space-y-4">
              {Object.entries(uploadProgress).map(([filename, progress]) => (
                <div key={filename} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{filename}</span>
                    <span className="text-gray-900">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-ocean-600 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredImages.map((image) => (
            <div
              key={image.storage_id}
              className="bg-white rounded-lg shadow-lg overflow-hidden group"
            >
              <div className="aspect-square relative">
                <img
                  src={image.url}
                  alt={image.display_name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => handleDeleteImage(image)}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">
                    {image.display_name}
                  </h3>
                  <button
                    onClick={() => {
                      setEditingImage(image);
                      setIsMetadataFormOpen(true);
                    }}
                    className="text-ocean-600 hover:text-ocean-700"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                {image.category && (
                  <span className="inline-block px-2 py-1 text-xs font-medium text-ocean-600 bg-ocean-50 rounded-full mb-2">
                    {image.category.name}
                  </span>
                )}
                {image.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                    {image.description}
                  </p>
                )}
                <button
                  onClick={() => copyToClipboard(image.url)}
                  className="flex items-center text-gray-500 hover:text-ocean-600 transition-colors text-sm"
                >
                  {copiedUrl === image.url ? (
                    <Check className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copy URL
                </button>
              </div>
            </div>
          ))}
          {filteredImages.length === 0 && !uploading && (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow-lg">
              <ImageIcon className="h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-600 text-center">
                No images found.{selectedCategory ? ' Try selecting a different category.' : ' Upload an image to get started.'}
              </p>
            </div>
          )}
        </div>

        {/* Metadata Edit Modal */}
        {isMetadataFormOpen && editingImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-display font-bold text-gray-900 mb-4">
                Edit Image Details
              </h2>
              <form onSubmit={handleUpdateMetadata} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    name="display_name"
                    defaultValue={editingImage.display_name}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category_id"
                    defaultValue={editingImage.category_id || ''}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">No Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    defaultValue={editingImage.description || ''}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMetadataFormOpen(false);
                      setEditingImage(null);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-ocean-600 text-white rounded-lg hover:bg-ocean-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageManager;