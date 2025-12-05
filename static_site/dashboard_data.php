    <div class="dashboard-main-body">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-24">
            <h6 class="fw-semibold mb-0">Dashboard</h6>
            <ul class="d-flex align-items-center gap-2">
                <li class="fw-medium">
                <a href="index.html" class="d-flex align-items-center gap-1 hover-text-primary">
                    <iconify-icon icon="solar:home-smile-angle-outline" class="icon text-lg"></iconify-icon>
                    Dashboard
                </a>
                </li>
                <li>-</li>
                <li class="fw-medium"> LMS / Learning System</li>
            </ul>
        </div>

        <div class="row gy-4 mb-24">
            <!-- ======================= First Row Cards Start =================== -->
            <div class="col-xxl-8">
                <div class="card radius-8 border-0 p-20">
                    <div class="row gy-4">
                        <div class="col-xxl-4">
                            <div class="card p-3 radius-8 shadow-none bg-gradient-dark-start-1 mb-12">
                                <div class="card-body p-0">
                                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-0">
                                        <div class="d-flex align-items-center gap-2 mb-12">
                                            <span
                                                class="mb-0 w-48-px h-48-px bg-base text-pink text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                                                <i class="ri-group-fill"></i>
                                            </span>
                                            <div>
                                                <span class="mb-0 fw-medium text-secondary-light text-lg">Total
                                                    Students</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-8">
                                        <h5 class="fw-semibold mb-0">15,000</h5>
                                        <p class="text-sm mb-0 d-flex align-items-center gap-8">
                                            <span
                                                class="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">+2.5k</span>
                                            This Month
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="card p-3 radius-8 shadow-none bg-gradient-dark-start-2 mb-12">
                                <div class="card-body p-0">
                                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-0">
                                        <div class="d-flex align-items-center gap-2 mb-12">
                                            <span
                                                class="mb-0 w-48-px h-48-px bg-base text-purple text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                                                <i class="ri-youtube-fill"></i>
                                            </span>
                                            <div>
                                                <span class="mb-0 fw-medium text-secondary-light text-lg">Total
                                                    Classes</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-8">
                                        <h5 class="fw-semibold mb-0">420</h5>
                                        <p class="text-sm mb-0 d-flex align-items-center gap-8">
                                            <span
                                                class="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">+30</span>
                                            This Month
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="card p-3 radius-8 shadow-none bg-gradient-dark-start-3 mb-0">
                                <div class="card-body p-0">
                                    <div class="d-flex flex-wrap align-items-center justify-content-between gap-1 mb-0">
                                        <div class="d-flex align-items-center gap-2 mb-12">
                                            <span
                                                class="mb-0 w-48-px h-48-px bg-base text-info text-2xl flex-shrink-0 d-flex justify-content-center align-items-center rounded-circle h6">
                                                <i class="ri-money-dollar-circle-fill"></i>
                                            </span>
                                            <div>
                                                <span class="mb-0 fw-medium text-secondary-light text-lg">Overall
                                                    Revenue</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-8">
                                        <h5 class="fw-semibold mb-0">$50,000</h5>
                                        <p class="text-sm mb-0 d-flex align-items-center gap-8">
                                            <span
                                                class="text-white px-1 rounded-2 fw-medium bg-success-main text-sm">+1.5k</span>
                                            This Month
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-xxl-8">
                            <div class="card-body p-0">
                                <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                                    <h6 class="mb-2 fw-bold text-lg">Average Enrollment Rate
                                    </h6>
                                    <div class="">
                                        <select
                                            class="form-select form-select-sm w-auto bg-base border text-secondary-light radius-8">
                                            <option>Yearly</option>
                                            <option>Monthly</option>
                                            <option>Weekly</option>
                                            <option>Today</option>
                                        </select>
                                    </div>
                                </div>
                                <ul class="d-flex flex-wrap align-items-center justify-content-center mt-3 gap-3">
                                    <li class="d-flex align-items-center gap-2">
                                        <span class="w-12-px h-12-px rounded-circle bg-primary-600"></span>
                                        <span class="text-secondary-light text-sm fw-semibold">Paid Course:
                                            <span class="text-primary-light fw-bold">350</span>
                                        </span>
                                    </li>
                                    <li class="d-flex align-items-center gap-2">
                                        <span class="w-12-px h-12-px rounded-circle bg-success-main"></span>
                                        <span class="text-secondary-light text-sm fw-semibold">Free Course:
                                            <span class="text-primary-light fw-bold">70</span>
                                        </span>
                                    </li>
                                </ul>
                                <div class="mt-40">
                                    <div id="enrollmentChart" class="apexcharts-tooltip-style-1"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-xxl-4 col-md-6">
                <div class="card h-100 radius-8 border-0">
                    <div class="card-body p-24 d-flex flex-column justify-content-between gap-8">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between mb-20">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Traffic Sources</h6>
                            <select
                                class="form-select form-select-sm w-auto bg-base border text-secondary-light radius-8">
                                <option>Yearly</option>
                                <option>Monthly</option>
                                <option>Weekly</option>
                                <option>Today</option>
                            </select>
                        </div>
                        <div id="userOverviewDonutChart" class="margin-16-minus y-value-left apexcharts-tooltip-z-none">
                        </div>

                        <ul class="d-flex flex-wrap align-items-center justify-content-between mt-3 gap-3">
                            <li class="d-flex flex-column gap-8">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="w-12-px h-12-px rounded-circle bg-warning-600"></span>
                                    <span class="text-secondary-light text-sm fw-semibold">Organic Search</span>
                                </div>
                                <span class="text-primary-light fw-bold">875</span>
                            </li>
                            <li class="d-flex flex-column gap-8">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="w-12-px h-12-px rounded-circle bg-success-600"></span>
                                    <span class="text-secondary-light text-sm fw-semibold">Referrals</span>
                                </div>
                                <span class="text-primary-light fw-bold">450</span>
                            </li>
                            <li class="d-flex flex-column gap-8">
                                <div class="d-flex align-items-center gap-2">
                                    <span class="w-12-px h-12-px rounded-circle bg-primary-600"></span>
                                    <span class="text-secondary-light text-sm fw-semibold">Social Media</span>
                                </div>
                                <span class="text-primary-light fw-bold">4,305</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <!-- ======================= First Row Cards End =================== -->

            <!-- ================== Second Row Cards Start ======================= -->
            <!-- Top Categories Card Start -->
            <div class="col-xxl-4 col-md-6">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Top Categories</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-info-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon1.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">Web Development</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-success-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon2.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">Graphic Design</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-lilac-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon3.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">UI/UX Design</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-warning-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon4.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">Digital Marketing</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-danger-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon5.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">3d Illustration & Art Design</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-0">
                            <div class="d-flex align-items-center gap-12">
                                <div
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 bg-primary-50 d-flex justify-content-center align-items-center">
                                    <img src="assets/images/home-six/category-icon6.png" alt="" class="">
                                </div>
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-normal">Logo Design</h6>
                                    <span class="text-sm text-secondary-light fw-normal">40+ Courses</span>
                                </div>
                            </div>
                            <a href="index-6.html#"
                                class="w-24-px h-24-px bg-primary-50 text-primary-600 d-flex justify-content-center align-items-center text-lg bg-hover-primary-100 radius-4">
                                <i class="ri-arrow-right-s-line"></i>
                            </a>
                        </div>

                    </div>
                </div>
            </div>
            <!-- Top Categories Card End -->

            <!-- Instructor Card Start -->
            <div class="col-xxl-4 col-md-6">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Top Instructors</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user1.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Dianne Russell</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user2.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Wade Warren</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user3.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Albert Flores</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user4.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Bessie Cooper</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user5.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Arlene McCoy</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>

                        <div class="d-flex align-items-center justify-content-between gap-3">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/users/user1.png" alt=""
                                    class="w-40-px h-40-px rounded-circle flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Arlene McCoy</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Agent ID: 36254</span>
                                </div>
                            </div>
                            <div class="">
                                <div class="d-flex align-items-center gap-6 mb-1">
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                    <span class="text-lg text-warning-600 d-flex line-height-1"><i
                                            class="ri-star-fill"></i></span>
                                </div>
                                <span class="text-primary-light text-sm d-block text-end">25 Reviews</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Instructor Card End -->


            <!-- Student Progress Card Start -->
            <div class="col-xxl-4 col-md-6">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Student's Progress</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img1.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Theresa Webb</h6>
                                    <span class="text-sm text-secondary-light fw-medium">UI/UX Design Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="33"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">33</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img2.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Robert Fox</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Graphic Design Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="70"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">70</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img3.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Guy Hawkins</h6>
                                    <span class="text-sm text-secondary-light fw-medium">Web developer Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="80"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">80</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img4.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Cody Fisher</h6>
                                    <span class="text-sm text-secondary-light fw-medium">UI/UX Design Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="20"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">20</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-24">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img5.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Robiul Hasan</h6>
                                    <span class="text-sm text-secondary-light fw-medium">UI/UX Design Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="40"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">40</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                        <div class="d-flex align-items-center justify-content-between gap-3 mb-0">
                            <div class="d-flex align-items-center">
                                <img src="assets/images/home-six/student-img6.png" alt=""
                                    class="w-40-px h-40-px radius-8 flex-shrink-0 me-12 overflow-hidden">
                                <div class="flex-grow-1">
                                    <h6 class="text-md mb-0 fw-medium">Darlene Robertson</h6>
                                    <span class="text-sm text-secondary-light fw-medium">UI/UX Design Course</span>
                                </div>
                            </div>
                            <div class="">
                                <span class="text-primary-light text-sm d-block text-end">
                                    <svg class="radial-progress radial-progress-sm" data-percentage="24"
                                        viewBox="0 0 80 80">
                                        <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                                        <circle class="complete" cx="40" cy="40" r="35"
                                            style="stroke-dashoffset: 39.58406743523136;"></circle>
                                        <text class="percentage text-primary-light" x="50%" y="57%"
                                            transform="matrix(0, 1, -1, 0, 80, 0)">24</text>
                                    </svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Student Progress Card End -->
            <!-- ================== Second Row Cards End ======================= -->


            <!-- ================== Third Row Cards Start ======================= -->
            <div class="col-xxl-8">
                <div class="card h-100">
                    <div class="card-header">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Courses</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                    </div>
                    <div class="card-body p-24">
                        <div class="table-responsive scroll-sm">
                            <table class="table bordered-table mb-0">
                                <thead>
                                    <tr>
                                        <th scope="col">Registered On</th>
                                        <th scope="col">Instructors </th>
                                        <th scope="col">Users</th>
                                        <th scope="col">Enrolled</th>
                                        <th scope="col">Price </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <span class="text-secondary-light">24 Jun 2024</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">Ronald Richards</span>
                                        </td>
                                        <td>
                                            <div class="text-secondary-light">
                                                <h6 class="text-md mb-0 fw-normal">3d Illustration &amp; Art Design</h6>
                                                <span class="text-sm fw-normal">34 Lessons</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">257</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">$29.00</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="text-secondary-light">24 Jun 2024</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">Jerome Bell</span>
                                        </td>
                                        <td>
                                            <div class="text-secondary-light">
                                                <h6 class="text-md mb-0 fw-normal">Advanced JavaScript Development</h6>
                                                <span class="text-sm fw-normal">20 Lessons</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">375</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">$29.00</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="text-secondary-light">24 Jun 2024</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">Cody Fisher</span>
                                        </td>
                                        <td>
                                            <div class="text-secondary-light">
                                                <h6 class="text-md mb-0 fw-normal">Portrait Drawing Fundamentals </h6>
                                                <span class="text-sm fw-normal">16 Lessons</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">220</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">$29.00</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="text-secondary-light">24 Jun 2024</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">Floyd Miles</span>
                                        </td>
                                        <td>
                                            <div class="text-secondary-light">
                                                <h6 class="text-md mb-0 fw-normal">Advanced App Development</h6>
                                                <span class="text-sm fw-normal">25 Lessons</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">57</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">$29.00</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <span class="text-secondary-light">24 Jun 2024</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">Ralph Edwards</span>
                                        </td>
                                        <td>
                                            <div class="text-secondary-light">
                                                <h6 class="text-md mb-0 fw-normal">HTML Fundamental Course</h6>
                                                <span class="text-sm fw-normal">17 Lessons </span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">27</span>
                                        </td>
                                        <td>
                                            <span class="text-secondary-light">$29.00</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xxl-4">
                <div class="card h-100">
                    <div class="card-header">
                        <div class="d-flex align-items-center flex-wrap gap-2 justify-content-between">
                            <h6 class="mb-2 fw-bold text-lg mb-0">Course Activity</h6>
                            <a href="javascript:void(0)"
                                class="text-primary-600 hover-text-primary d-flex align-items-center gap-1">
                                View All
                                <iconify-icon icon="solar:alt-arrow-right-linear" class="icon"></iconify-icon>
                            </a>
                        </div>
                    </div>
                    <div class="card-body p-24">
                        <ul class="d-flex flex-wrap align-items-center justify-content-center my-3 gap-3">
                            <li class="d-flex align-items-center gap-2">
                                <span class="w-12-px h-12-px rounded-circle bg-warning-600"></span>
                                <span class="text-secondary-light text-sm fw-semibold">Paid Course:
                                    <span class="text-primary-light fw-bold">500</span>
                                </span>
                            </li>
                            <li class="d-flex align-items-center gap-2">
                                <span class="w-12-px h-12-px rounded-circle bg-success-main"></span>
                                <span class="text-secondary-light text-sm fw-semibold">Free Course:
                                    <span class="text-primary-light fw-bold">300</span>
                                </span>
                            </li>
                        </ul>
                        <div id="paymentStatusChart" class="margin-16-minus y-value-left"></div>
                    </div>
                </div>
            </div>
            <!-- ================== Third Row Cards End ======================= -->

        </div>

    </div>