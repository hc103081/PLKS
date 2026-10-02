export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      answer_logs: {
        Row: {
          course_id: string;
          created_at: string | null;
          id: string;
          is_correct: boolean;
          quiz_id: string;
          response_time_ms: number | null;
          sidekick_context: Json | null;
          sidekick_used: boolean | null;
          user_answer: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          id?: string;
          is_correct: boolean;
          quiz_id: string;
          response_time_ms?: number | null;
          sidekick_context?: Json | null;
          sidekick_used?: boolean | null;
          user_answer: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          id?: string;
          is_correct?: boolean;
          quiz_id?: string;
          response_time_ms?: number | null;
          sidekick_context?: Json | null;
          sidekick_used?: boolean | null;
          user_answer?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "answer_logs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "answer_logs_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quiz_items";
            referencedColumns: ["quiz_id"];
          },
        ];
      };
      chat_messages: {
        Row: {
          content: string;
          created_at: string | null;
          id: string;
          metadata: Json | null;
          role: string;
          session_id: string;
        };
        Insert: {
          content: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          role: string;
          session_id: string;
        };
        Update: {
          content?: string;
          created_at?: string | null;
          id?: string;
          metadata?: Json | null;
          role?: string;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "chat_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_sessions: {
        Row: {
          course_id: string;
          created_at: string | null;
          id: string;
          quiz_id: string | null;
          status: string;
          title: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          id?: string;
          quiz_id?: string | null;
          status?: string;
          title?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          id?: string;
          quiz_id?: string | null;
          status?: string;
          title?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chat_sessions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quiz_items";
            referencedColumns: ["quiz_id"];
          },
        ];
      };
      concept_nodes: {
        Row: {
          b2_json_uri: string | null;
          b2_markdown_uri: string | null;
          concept_id: string;
          course_id: string;
          created_at: string | null;
          explanation: string;
          exported_at: string | null;
          id: string;
          related_terms: string[] | null;
          source_slide_uri: string | null;
          source_transcript_ref: string | null;
          term: string;
          updated_at: string | null;
        };
        Insert: {
          b2_json_uri?: string | null;
          b2_markdown_uri?: string | null;
          concept_id?: string;
          course_id: string;
          created_at?: string | null;
          explanation: string;
          exported_at?: string | null;
          id?: string;
          related_terms?: string[] | null;
          source_slide_uri?: string | null;
          source_transcript_ref?: string | null;
          term: string;
          updated_at?: string | null;
        };
        Update: {
          b2_json_uri?: string | null;
          b2_markdown_uri?: string | null;
          concept_id?: string;
          course_id?: string;
          created_at?: string | null;
          explanation?: string;
          exported_at?: string | null;
          id?: string;
          related_terms?: string[] | null;
          source_slide_uri?: string | null;
          source_transcript_ref?: string | null;
          term?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "concept_nodes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          b2_export_dir: string | null;
          cover_image_uri: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          code: string;
          semester_code: string;
          status: string;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          b2_export_dir?: string | null;
          cover_image_uri?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          code: string;
          semester_code: string;
          status?: string;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          b2_export_dir?: string | null;
          cover_image_uri?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          code?: string;
          semester_code?: string;
          status?: string;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_semester_code_fkey";
            columns: ["semester_code"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["code"];
          },
        ];
      };
      export_errors: {
        Row: {
          course_id: string;
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          error_code: string;
          error_message: string;
          id: string;
          last_attempt_at: string | null;
          max_retries: number;
          resolved_at: string | null;
          retry_count: number;
        };
        Insert: {
          course_id: string;
          created_at?: string | null;
          entity_id: string;
          entity_type: string;
          error_code: string;
          error_message: string;
          id?: string;
          last_attempt_at?: string | null;
          max_retries?: number;
          resolved_at?: string | null;
          retry_count?: number;
        };
        Update: {
          course_id?: string;
          created_at?: string | null;
          entity_id?: string;
          entity_type?: string;
          error_code?: string;
          error_message?: string;
          id?: string;
          last_attempt_at?: string | null;
          max_retries?: number;
          resolved_at?: string | null;
          retry_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "export_errors_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      quiz_items: {
        Row: {
          b2_json_uri: string | null;
          context_reference: string;
          correct_answer: string;
          course_id: string;
          created_at: string | null;
          difficulty: number | null;
          explanation: string | null;
          exported_at: string | null;
          id: string;
          options: string[] | null;
          question: string;
          quiz_id: string;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          b2_json_uri?: string | null;
          context_reference: string;
          correct_answer: string;
          course_id: string;
          created_at?: string | null;
          difficulty?: number | null;
          explanation?: string | null;
          exported_at?: string | null;
          id?: string;
          options?: string[] | null;
          question: string;
          quiz_id?: string;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          b2_json_uri?: string | null;
          context_reference?: string;
          correct_answer?: string;
          course_id?: string;
          created_at?: string | null;
          difficulty?: number | null;
          explanation?: string | null;
          exported_at?: string | null;
          id?: string;
          options?: string[] | null;
          question?: string;
          quiz_id?: string;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_items_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      semesters: {
        Row: {
          code: string;
          created_at: string | null;
          label: string;
          sort_order: number;
          term: number;
          year: number;
        };
        Insert: {
          code: string;
          created_at?: string | null;
          label: string;
          sort_order: number;
          term: number;
          year: number;
        };
        Update: {
          code?: string;
          created_at?: string | null;
          label?: string;
          sort_order?: number;
          term?: number;
          year?: number;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          concept_id: string;
          course_id: string;
          created_at: string | null;
          due_date: string;
          ease_factor: number;
          id: string;
          interval_days: number;
          last_reviewed_at: string | null;
          repetitions: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          concept_id: string;
          course_id: string;
          created_at?: string | null;
          due_date?: string;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          concept_id?: string;
          course_id?: string;
          created_at?: string | null;
          due_date?: string;
          ease_factor?: number;
          id?: string;
          interval_days?: number;
          last_reviewed_at?: string | null;
          repetitions?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_progress_concept_id_fkey";
            columns: ["concept_id"];
            isOneToOne: false;
            referencedRelation: "concept_nodes";
            referencedColumns: ["concept_id"];
          },
          {
            foreignKeyName: "user_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_retryable_export_errors: {
        Args: { p_limit?: number };
        Returns: {
          course_id: string;
          created_at: string | null;
          entity_id: string;
          entity_type: string;
          error_code: string;
          error_message: string;
          id: string;
          last_attempt_at: string | null;
          max_retries: number;
          resolved_at: string | null;
          retry_count: number;
        }[];
        SetofOptions: {
          from: "*";
          to: "export_errors";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      increment_export_error_retry: {
        Args: { p_error_id: string };
        Returns: boolean;
      };
      log_export_error: {
        Args: {
          p_course_id: string;
          p_entity_id: string;
          p_entity_type: string;
          p_error_code: string;
          p_error_message: string;
          p_max_retries?: number;
        };
        Returns: string;
      };
      resolve_export_error: {
        Args: { p_entity_id: string; p_entity_type: string };
        Returns: boolean;
      };
      trigger_export_to_b2: { Args: never; Returns: undefined };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Course = {
  b2_export_dir: string | null;
  cover_image_uri: string | null;
  created_at: string | null;
  description: string | null;
  id: string;
  name: string;
  code: string;
  semester_code: string;
  status: string;
  updated_at: string | null;
  user_id: string;
  semesters: {
    code: string;
    year: number;
    term: number;
    label: string;
    sort_order: number;
  } | null;
};

export type ConceptNodeInput = {
  conceptId: string;
  courseId: string;
  term: string;
  explanation: string;
  relatedTerms: string[];
  sourceEvidence: {
    transcriptRef: string;
    slideUri: string;
  };
};

export type ConceptNode = ConceptNodeInput;

export type QuizItemInput = {
  quizId: string;
  courseId: string;
  type: "multiple_choice" | "true_false" | "short_answer";
  question: string;
  options: string[] | undefined;
  correctAnswer: string;
  contextReference: string;
};

export type QuizItem = QuizItemInput;

export type Progress = {
  concept_id: string;
  course_id: string;
  created_at: string | null;
  due_date: string;
  ease_factor: number;
  id: string;
  interval_days: number;
  last_reviewed_at: string | null;
  repetitions: number;
  updated_at: string | null;
  user_id: string;
};

export type ProgressInput = {
  concept_id: string;
  course_id: string;
  user_id: string;
  created_at?: string | null;
  due_date?: string;
  ease_factor?: number;
  id?: string;
  interval_days?: number;
  last_reviewed_at?: string | null;
  repetitions?: number;
  updated_at?: string | null;
};

export type AnswerLogInput = {
  course_id: string;
  created_at?: string | null;
  id?: string;
  is_correct: boolean;
  quiz_id: string;
  response_time_ms?: number | null;
  sidekick_context: Json | null;
  sidekick_used?: boolean | null;
  user_answer: string;
  user_id: string;
};

export type ChatMessage = {
  content: string;
  created_at: string | null;
  id: string;
  metadata: Json | null;
  role: string;
  session_id: string;
};

export type ChatMessageInput = {
  content: string;
  created_at?: string | null;
  id?: string;
  metadata?: Json | null;
  role: string;
  session_id: string;
};

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
