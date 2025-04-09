export default ({ env }) => ({
    upload: {
      config: {
        provider: 'aws-s3',
        providerOptions: {
          s3Options: {
            credentials: {
              accessKeyId: env('AWS_ACCESS_KEY_ID'),
              secretAccessKey: env('AWS_ACCESS_SECRET'),
            },
            region: env('AWS_REGION'),
            params: {
              Bucket: env('AWS_BUCKET'),
            },
          },
          // Add these key configurations:
          basePath: 'avatars', // Ensures all uploads go to avatars folder
          rootPath: 'avatars', // Optional: Additional subfolder structure
        },
        actionOptions: {
          upload: { ACL: 'public-read' },
          uploadStream: { ACL: 'public-read' },
        },
      },
    },
  });