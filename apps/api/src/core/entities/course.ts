// apps/api/src/core/entities/course.ts
export class Course {
  constructor(
    public readonly courseId: string,
    public readonly title: string,
    public readonly description: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static create(courseId: string, title: string, description: string): Course {
    const now = new Date();
    return new Course(courseId, title, description, now, now);
  }

  update(title: string, description: string): Course {
    return new Course(this.courseId, title, description, this.createdAt, new Date());
  }
}